import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import AdminLayout from "../../components/layout/AdminLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import { CASE_TYPE_LABELS } from "../../components/admin/CaseTypeBadge";
import { useApplicants } from "../../hooks/useApplicants";
import { useCreateCase } from "../../hooks/useCases";

const CASE_TYPES = Object.entries(CASE_TYPE_LABELS).map(([value, label]) => ({ value, label }));

const STATUSES = [
  { value: "open",        label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "submitted",   label: "Submitted" },
  { value: "approved",    label: "Approved" },
  { value: "rejected",    label: "Rejected" },
  { value: "closed",      label: "Closed" },
];

const schema = z.object({
  applicant_id: z.string().min(1, "Applicant is required"),
  case_type:    z.enum(Object.keys(CASE_TYPE_LABELS), { required_error: "Case type is required" }),
  title:        z.string().trim().min(1, "Title is required").max(255),
  status:       z.string().default("open"),
  description:  z.string().trim().optional(),
  assigned_to:  z.string().optional(),
});

const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";

const CreateCase = () => {
  const navigate = useNavigate();
  const createCase = useCreateCase();
  const { data: applicants = [] } = useApplicants();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { status: "open" } });

  const selectedApplicantId = watch("applicant_id");
  const selectedCaseType    = watch("case_type");

  // Auto-populate title when applicant + case type are chosen
  useEffect(() => {
    if (!selectedApplicantId || !selectedCaseType) return;
    const applicant = applicants.find(
      (a) => a._id === selectedApplicantId || a.id === selectedApplicantId
    );
    if (!applicant) return;
    const name = applicant.contactInfo?.name || applicant.username || "Applicant";
    const typeLabel = CASE_TYPE_LABELS[selectedCaseType] ?? selectedCaseType;
    setValue("title", `${name} — ${typeLabel}`, { shouldValidate: false });
  }, [selectedApplicantId, selectedCaseType, applicants, setValue]);

  const onSubmit = async (values) => {
    try {
      const payload = { ...values };
      if (!payload.assigned_to) delete payload.assigned_to;
      if (!payload.description) delete payload.description;

      const newCase = await createCase.mutateAsync(payload);
      toast.success(`Case created — ${newCase.matter_number}`);
      navigate(`/admin/cases/${newCase.id}`);
    } catch (err) {
      toast.error(err?.message || "Failed to create case.");
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Case</h1>
          <p className="text-gray-600 mt-2">Open a new immigration matter for a client.</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            <Card.Header>
              <h2 className="text-xl font-semibold">Case Information</h2>
            </Card.Header>

            <Card.Body className="space-y-6">
              {/* Applicant */}
              <div>
                <label htmlFor="applicant_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Applicant <span className="text-red-500">*</span>
                </label>
                <select id="applicant_id" {...register("applicant_id")} className={inputCls}>
                  <option value="">Select applicant…</option>
                  {applicants.map((a) => {
                    const name  = a.contactInfo?.name || a.username || "Unknown";
                    const email = a.contactInfo?.email || a.email || "";
                    const id    = a._id || a.id;
                    return (
                      <option key={id} value={id}>
                        {name}{email ? ` — ${email}` : ""}
                      </option>
                    );
                  })}
                </select>
                {errors.applicant_id && (
                  <p className="mt-1 text-xs text-red-600">{errors.applicant_id.message}</p>
                )}
              </div>

              {/* Case Type */}
              <div>
                <label htmlFor="case_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Case Type <span className="text-red-500">*</span>
                </label>
                <select id="case_type" {...register("case_type")} className={inputCls}>
                  <option value="">Select case type…</option>
                  {CASE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {errors.case_type && (
                  <p className="mt-1 text-xs text-red-600">{errors.case_type.message}</p>
                )}
              </div>

              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  {...register("title")}
                  className={inputCls}
                  placeholder="Case title"
                />
                {errors.title && (
                  <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select id="status" {...register("status")} className={inputCls}>
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  {...register("description")}
                  className={inputCls}
                  placeholder="Optional notes or context for this case"
                />
              </div>
            </Card.Body>

            <Card.Footer>
              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => navigate("/admin/cases")}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={isSubmitting} disabled={isSubmitting}>
                  Create Case
                </Button>
              </div>
            </Card.Footer>
          </form>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default CreateCase;
