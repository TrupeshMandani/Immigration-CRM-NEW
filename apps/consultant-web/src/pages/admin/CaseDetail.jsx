import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import AdminLayout from "../../components/layout/AdminLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import CaseStatusBadge from "../../components/admin/CaseStatusBadge";
import CaseTypeBadge, { CASE_TYPE_LABELS } from "../../components/admin/CaseTypeBadge";
import { useCase, useCaseEvents, useUpdateCase, useDeleteCase } from "../../hooks/useCases";
import { useCaseDeadlines, useAcknowledgeDeadline } from "../../hooks/useDeadlines";
import DeadlineUrgencyBadge from "../../components/admin/DeadlineUrgencyBadge";

const CASE_TYPES = Object.entries(CASE_TYPE_LABELS).map(([value, label]) => ({ value, label }));

const STATUSES = [
  { value: "open",        label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "submitted",   label: "Submitted" },
  { value: "approved",    label: "Approved" },
  { value: "rejected",    label: "Rejected" },
  { value: "closed",      label: "Closed" },
];

const EVENT_ICONS = {
  case_created:          "✦",
  status_changed:        "↔",
  assignment_changed:    "👤",
  document_added:        "📄",
  task_added:            "✅",
  note_added:            "💬",
  metadata_updated:      "✏",
  deadline_added:        "📅",
  deadline_updated:      "✏",
  deadline_acknowledged: "✓",
};

function formatRelativeTime(dateStr) {
  if (!dateStr) return "Unknown";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const SectionNav = ({ sections, currentHash }) => (
  <div className="border-b border-gray-200 bg-white p-1 rounded-xl shadow-sm">
    <div className="-m-1 flex flex-wrap gap-2 overflow-x-auto px-4 py-3 sm:px-6">
      {sections.map((section, index) => {
        const isActive = currentHash === section.id || (!currentHash && index === 0);
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={`m-1 inline-flex items-center whitespace-nowrap rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "border-primary bg-primary text-white"
                : "border-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-100"
            }`}
          >
            {section.label}
          </a>
        );
      })}
    </div>
  </div>
);

const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-sm";

const CaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: caseRecord, isLoading, isError } = useCase(id);
  const { data: events = [] } = useCaseEvents(id);
  const { data: caseDeadlines = [] } = useCaseDeadlines(id);
  const acknowledgeDeadline = useAcknowledgeDeadline();
  const updateCase = useUpdateCase(id);
  const deleteCase = useDeleteCase();

  const [editForm, setEditForm]           = useState(null);
  const [saving, setSaving]               = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const currentHash = useMemo(
    () => location.hash?.replace("#", "") || "",
    [location.hash]
  );

  const sections = useMemo(() => [
    { id: "overview",   label: "Overview" },
    { id: "details",    label: "Details" },
    { id: "documents",  label: "Documents" },
    { id: "tasks",      label: "Tasks" },
    { id: "deadlines",  label: `Deadlines${caseDeadlines.length ? ` (${caseDeadlines.length})` : ""}` },
    { id: "timeline",   label: "Timeline" },
    { id: "actions",    label: "Actions" },
  ], [caseDeadlines.length]);

  const startEdit = () => {
    if (!caseRecord) return;
    setEditForm({
      case_type:   caseRecord.case_type,
      title:       caseRecord.title,
      status:      caseRecord.status,
      description: caseRecord.description ?? "",
      assigned_to: caseRecord.assigned_to ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editForm) return;
    setSaving(true);
    try {
      const patch = { ...editForm };
      if (!patch.assigned_to) delete patch.assigned_to;
      if (!patch.description) delete patch.description;
      await updateCase.mutateAsync(patch);
      toast.success("Case updated.");
      setEditForm(null);
    } catch (err) {
      toast.error(err?.message || "Failed to update case.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCase.mutateAsync(id);
      toast.success("Case deleted.");
      navigate("/admin/cases");
    } catch (err) {
      toast.error(err?.message || "Failed to delete case.");
    } finally {
      setConfirmDelete(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-96 items-center justify-center">
          <Loading size="lg" text="Loading case…" />
        </div>
      </AdminLayout>
    );
  }

  if (isError || !caseRecord) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Case not found</h2>
          <p className="text-gray-500 mb-6">This case may have been deleted or you don't have access.</p>
          <Link to="/admin/cases"><Button variant="outline">Back to Cases</Button></Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      topbar={
        <SectionNav sections={sections} currentHash={currentHash} />
      }
    >
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">

        {/* ── Overview ─────────────────────────────────────────────────── */}
        <section id="overview" className="scroll-mt-20">
          <Card>
            <Card.Body>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link to="/admin/cases" className="text-xs text-primary hover:underline">
                    ← Back to Cases
                  </Link>
                  <h1 className="mt-2 text-2xl font-bold text-gray-900 break-words">
                    {caseRecord.title}
                  </h1>
                  <p className="mt-1 font-mono text-sm text-gray-400">
                    {caseRecord.matter_number ?? "No matter number"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <CaseStatusBadge status={caseRecord.status} />
                  <CaseTypeBadge caseType={caseRecord.case_type} />
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-400">
                Created {caseRecord.created_at ? new Date(caseRecord.created_at).toLocaleString() : "Unknown"}
              </p>
            </Card.Body>
          </Card>
        </section>

        {/* ── Details ──────────────────────────────────────────────────── */}
        <section id="details" className="scroll-mt-20">
          <Card>
            <Card.Header className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Details</h2>
              {!editForm && (
                <Button variant="outline" size="sm" onClick={startEdit}>Edit</Button>
              )}
            </Card.Header>
            <Card.Body>
              {editForm ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Case Type</label>
                    <select
                      value={editForm.case_type}
                      onChange={(e) => setEditForm((f) => ({ ...f, case_type: e.target.value }))}
                      className={inputCls}
                    >
                      {CASE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                      className={inputCls}
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={editForm.description}
                      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setEditForm(null)} disabled={saving}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={saveEdit} loading={saving} disabled={saving}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
                  <div>
                    <dt className="font-medium text-gray-500">Case Type</dt>
                    <dd className="mt-1"><CaseTypeBadge caseType={caseRecord.case_type} /></dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Status</dt>
                    <dd className="mt-1"><CaseStatusBadge status={caseRecord.status} /></dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-medium text-gray-500">Title</dt>
                    <dd className="mt-1 text-gray-900">{caseRecord.title}</dd>
                  </div>
                  {caseRecord.description && (
                    <div className="sm:col-span-2">
                      <dt className="font-medium text-gray-500">Description</dt>
                      <dd className="mt-1 text-gray-700 whitespace-pre-wrap">{caseRecord.description}</dd>
                    </div>
                  )}
                  {caseRecord.assigned_to && (
                    <div>
                      <dt className="font-medium text-gray-500">Assigned To</dt>
                      <dd className="mt-1 text-gray-900">{caseRecord.assigned_to}</dd>
                    </div>
                  )}
                </dl>
              )}
            </Card.Body>
          </Card>
        </section>

        {/* ── Documents (placeholder) ───────────────────────────────────── */}
        <section id="documents" className="scroll-mt-20">
          <Card>
            <Card.Header>
              <h2 className="text-lg font-semibold">Documents</h2>
            </Card.Header>
            <Card.Body>
              <div className="rounded-lg border-2 border-dashed border-gray-200 py-12 text-center text-gray-500">
                <svg className="mx-auto h-10 w-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium text-gray-600">Documents linked to this case will appear here.</p>
                <p className="mt-1 text-xs text-gray-400">Document management is coming in Phase 2.</p>
              </div>
            </Card.Body>
          </Card>
        </section>

        {/* ── Tasks (placeholder) ───────────────────────────────────────── */}
        <section id="tasks" className="scroll-mt-20">
          <Card>
            <Card.Header>
              <h2 className="text-lg font-semibold">Tasks</h2>
            </Card.Header>
            <Card.Body>
              <div className="rounded-lg border-2 border-dashed border-gray-200 py-12 text-center text-gray-500">
                <svg className="mx-auto h-10 w-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <p className="text-sm font-medium text-gray-600">Tasks linked to this case will appear here.</p>
                <p className="mt-1 text-xs text-gray-400">Workflow templates are coming in Sprint 4.</p>
              </div>
            </Card.Body>
          </Card>
        </section>

        {/* ── Deadlines ─────────────────────────────────────────────────── */}
        <section id="deadlines" className="scroll-mt-20">
          <Card>
            <Card.Header className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Deadlines</h2>
              <Link to={`/admin/deadlines/create?case_id=${id}`}>
                <Button variant="outline" size="sm">+ Add Deadline</Button>
              </Link>
            </Card.Header>
            <Card.Body>
              {caseDeadlines.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-200 py-10 text-center text-gray-500">
                  <p className="text-sm font-medium text-gray-600">No deadlines for this case.</p>
                  <Link
                    to={`/admin/deadlines/create?case_id=${id}`}
                    className="mt-2 inline-block text-sm text-primary hover:underline"
                  >
                    Add the first deadline
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {caseDeadlines.map((d) => (
                    <div
                      key={d.id}
                      className={`flex items-start justify-between rounded-lg border px-4 py-3 ${
                        d.acknowledged_at
                          ? "bg-gray-50 border-gray-200 opacity-60"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <DeadlineUrgencyBadge urgency={d.urgency} />
                          <span className="text-xs text-gray-500">{d.due_date}</span>
                        </div>
                        <p className="font-medium text-gray-900 text-sm">{d.label}</p>
                        {d.description && (
                          <p className="text-xs text-gray-500 mt-1">{d.description}</p>
                        )}
                        {d.acknowledged_at && (
                          <p className="text-xs text-green-600 mt-1">
                            Acknowledged {new Date(d.acknowledged_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {!d.acknowledged_at && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-4 shrink-0"
                          onClick={() =>
                            acknowledgeDeadline.mutateAsync(d.id).catch((err) =>
                              toast.error(err?.message || "Failed to acknowledge")
                            )
                          }
                          loading={acknowledgeDeadline.isPending}
                        >
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </section>

        {/* ── Timeline ─────────────────────────────────────────────────── */}
        <section id="timeline" className="scroll-mt-20">
          <Card>
            <Card.Header>
              <h2 className="text-lg font-semibold">Timeline</h2>
            </Card.Header>
            <Card.Body>
              {events.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No events yet.</p>
              ) : (
                <ol className="relative border-l border-gray-200 ml-4 space-y-6">
                  {events.map((event) => (
                    <li key={event.id} className="ml-6">
                      <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 ring-4 ring-white text-xs">
                        {EVENT_ICONS[event.event_type] ?? "•"}
                      </span>
                      <div className="rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm">
                        <p className="text-sm font-medium text-gray-900">{event.label}</p>
                        {event.old_value && event.new_value && (
                          <p className="mt-0.5 text-xs text-gray-500">
                            {JSON.stringify(event.old_value)} → {JSON.stringify(event.new_value)}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-400">
                          {formatRelativeTime(event.created_at)} ·{" "}
                          {event.created_at ? new Date(event.created_at).toLocaleString() : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card.Body>
          </Card>
        </section>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <section id="actions" className="scroll-mt-20">
          <Card className="border border-red-100">
            <Card.Header>
              <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
            </Card.Header>
            <Card.Body>
              {isAdmin ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Delete this case</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Permanently removes the case and all associated events. Cannot be undone.
                    </p>
                  </div>
                  <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                    Delete Case
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Only admins can delete cases.</p>
              )}
            </Card.Body>
          </Card>
        </section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete case?"
        description={`Delete "${caseRecord.title}" and all its events? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </AdminLayout>
  );
};

export default CaseDetail;
