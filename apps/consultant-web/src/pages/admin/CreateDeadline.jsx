import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import AdminLayout from "../../components/layout/AdminLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import { useCases } from "../../hooks/useCases";
import { useCreateDeadline } from "../../hooks/useDeadlines";
import {
  DEADLINE_TYPE_LABELS,
  DEFAULT_NOTIFICATIONS,
} from "../../components/admin/DeadlineTypeLabel";

const DEADLINE_TYPES = Object.entries(DEADLINE_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const NOTIFICATION_OPTIONS = [1, 3, 7, 14, 30, 60, 90, 180];

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-sm";

export default function CreateDeadline() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillCaseId = searchParams.get("case_id") ?? "";

  const createDeadline = useCreateDeadline();
  const { data: cases = [] } = useCases();

  const [form, setForm] = useState({
    case_id:                  prefillCaseId,
    applicant_id:             "",
    deadline_type:            "",
    label:                    "",
    due_date:                 "",
    description:              "",
    assigned_to:              "",
    days_before_notification: [],
  });

  const [errors, setErrors] = useState({});

  // Auto-populate applicant when case is selected
  useEffect(() => {
    if (!form.case_id) return;
    const selected = cases.find((c) => c.id === form.case_id);
    if (selected) {
      setForm((f) => ({ ...f, applicant_id: selected.applicant_id ?? "" }));
    }
  }, [form.case_id, cases]);

  // Auto-populate label + notification windows when type changes
  useEffect(() => {
    if (!form.deadline_type) return;
    const label = DEADLINE_TYPE_LABELS[form.deadline_type] ?? "";
    const windows = DEFAULT_NOTIFICATIONS[form.deadline_type] ?? [30, 14, 7];
    setForm((f) => ({ ...f, label, days_before_notification: windows }));
  }, [form.deadline_type]);

  const toggleNotificationDay = (day) => {
    setForm((f) => ({
      ...f,
      days_before_notification: f.days_before_notification.includes(day)
        ? f.days_before_notification.filter((d) => d !== day)
        : [...f.days_before_notification, day].sort((a, b) => b - a),
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.case_id)       e.case_id       = "Case is required";
    if (!form.deadline_type) e.deadline_type = "Deadline type is required";
    if (!form.label.trim())  e.label         = "Label is required";
    if (!form.due_date)      e.due_date      = "Due date is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const payload = {
        case_id:                  form.case_id,
        applicant_id:             form.applicant_id,
        deadline_type:            form.deadline_type,
        label:                    form.label.trim(),
        due_date:                 form.due_date,
        description:              form.description.trim() || undefined,
        assigned_to:              form.assigned_to || null,
        days_before_notification: form.days_before_notification,
      };
      await createDeadline.mutateAsync(payload);
      toast.success("Deadline added.");
      navigate("/admin/calendar");
    } catch (err) {
      toast.error(err?.message || "Failed to create deadline.");
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-primary hover:underline mb-2 block"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Add Deadline</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Create a legal deadline tied to a case
          </p>
        </div>

        <Card>
          <Card.Body>
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Case */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Case <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.case_id}
                  onChange={(e) => setForm((f) => ({ ...f, case_id: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Select a case…</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.matter_number ? `${c.matter_number} — ` : ""}{c.title}
                    </option>
                  ))}
                </select>
                {errors.case_id && (
                  <p className="mt-1 text-xs text-red-600">{errors.case_id}</p>
                )}
              </div>

              {/* Deadline Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.deadline_type}
                  onChange={(e) => setForm((f) => ({ ...f, deadline_type: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Select type…</option>
                  {DEADLINE_TYPES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {errors.deadline_type && (
                  <p className="mt-1 text-xs text-red-600">{errors.deadline_type}</p>
                )}
              </div>

              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Auto-populated from type (can override)"
                  className={inputCls}
                />
                {errors.label && (
                  <p className="mt-1 text-xs text-red-600">{errors.label}</p>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className={inputCls}
                />
                {errors.due_date && (
                  <p className="mt-1 text-xs text-red-600">{errors.due_date}</p>
                )}
              </div>

              {/* Notification Windows */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notify Before (days)
                </label>
                <div className="flex flex-wrap gap-2">
                  {NOTIFICATION_OPTIONS.map((day) => {
                    const checked = form.days_before_notification.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleNotificationDay(day)}
                        className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                          checked
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-gray-600 border-gray-300 hover:border-primary"
                        }`}
                      >
                        {day}d
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Pre-selected based on deadline type. Notifications fire on these days before the due date.
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Additional notes about this deadline…"
                  className={inputCls}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => navigate(-1)}
                  disabled={createDeadline.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  loading={createDeadline.isPending}
                  disabled={createDeadline.isPending}
                >
                  Add Deadline
                </Button>
              </div>

            </form>
          </Card.Body>
        </Card>
      </div>
    </AdminLayout>
  );
}
