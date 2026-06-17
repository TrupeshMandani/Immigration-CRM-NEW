import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AdminLayout from "../../components/layout/AdminLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import ViewToggle from "../../components/common/ViewToggle";
import CaseCard from "../../components/admin/CaseCard";
import CaseStatusBadge from "../../components/admin/CaseStatusBadge";
import CaseTypeBadge, { CASE_TYPE_LABELS } from "../../components/admin/CaseTypeBadge";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useViewMode } from "../../hooks/useViewMode";
import { useCases, useDeleteCase } from "../../hooks/useCases";

const CASE_TYPES = Object.entries(CASE_TYPE_LABELS).map(([value, label]) => ({ value, label }));

const STATUSES = [
  { value: "open",        label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "submitted",   label: "Submitted" },
  { value: "approved",    label: "Approved" },
  { value: "rejected",    label: "Rejected" },
  { value: "closed",      label: "Closed" },
];

const CaseList = () => {
  const navigate = useNavigate();
  const [search, setSearch]         = useState("");
  const [caseType, setCaseType]     = useState("");
  const [status, setStatus]         = useState("");
  const [confirmDelete, setConfirmDelete] = useState({ open: false, caseId: null });

  const [viewMode, setViewMode] = useViewMode("caseList_viewMode", ["card", "list", "table"], "card");

  const params = {};
  if (search)   params.search    = search;
  if (caseType) params.case_type = caseType;
  if (status)   params.status    = status;

  const { data: cases = [], isLoading, isError } = useCases(
    Object.keys(params).length ? params : undefined
  );
  const deleteCase = useDeleteCase();

  const handleDelete = (id) => setConfirmDelete({ open: true, caseId: id });

  const confirmDeleteCase = async () => {
    const id = confirmDelete.caseId;
    if (!id) return;
    try {
      await deleteCase.mutateAsync(id);
      toast.success("Case deleted.");
    } catch {
      toast.error("Failed to delete case. Please try again.");
    } finally {
      setConfirmDelete({ open: false, caseId: null });
    }
  };

  const clearFilters = () => { setSearch(""); setCaseType(""); setStatus(""); };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-96 items-center justify-center">
          <Loading size="lg" text="Loading cases..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cases / Matters</h1>
            <p className="text-gray-600 mt-1">
              {cases.length} case{cases.length !== 1 ? "s" : ""} in your firm
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ViewToggle
              currentView={viewMode}
              onViewChange={setViewMode}
              views={["card", "list", "table"]}
              storageKey="caseList_viewMode"
            />
            <Link to="/admin/cases/create">
              <Button variant="primary" icon="plus">Create Case</Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-sm mb-8">
          <Card.Body>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Title or matter number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Case Type</label>
                <select
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">All Types</option>
                  {CASE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">All Statuses</option>
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full md:w-auto">
                  Clear Filters
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>

        {isError && (
          <Card className="border border-red-200 bg-red-50 mb-6">
            <Card.Body>
              <p className="text-sm text-red-700">Failed to load cases. Please refresh and try again.</p>
            </Card.Body>
          </Card>
        )}

        {/* Case Data */}
        {cases.length > 0 ? (
          <>
            {viewMode === "card" && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {cases.map((c) => (
                  <CaseCard key={c.id} caseRecord={c} onDelete={handleDelete} />
                ))}
              </div>
            )}

            {viewMode === "list" && (
              <div className="space-y-3">
                {cases.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/admin/cases/${c.id}`)}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:shadow-md hover:border-primary/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono text-gray-400">{c.matter_number ?? "—"}</p>
                      <p className="font-medium text-gray-900 truncate">{c.title}</p>
                    </div>
                    <div className="ml-4 flex shrink-0 items-center gap-3">
                      <CaseTypeBadge caseType={c.case_type} />
                      <CaseStatusBadge status={c.status} />
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {viewMode === "table" && (
              <Card className="overflow-hidden">
                <Card.Body className="p-0">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                        <tr>
                          <th className="px-6 py-3 text-left font-medium">Matter #</th>
                          <th className="px-6 py-3 text-left font-medium">Title</th>
                          <th className="px-6 py-3 text-left font-medium">Type</th>
                          <th className="px-6 py-3 text-left font-medium">Status</th>
                          <th className="px-6 py-3 text-left font-medium">Created</th>
                          <th className="px-6 py-3 text-left font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {cases.map((c) => (
                          <tr
                            key={c.id}
                            onClick={() => navigate(`/admin/cases/${c.id}`)}
                            className="cursor-pointer transition hover:bg-gray-50"
                          >
                            <td className="px-6 py-4 font-mono text-xs text-gray-500">
                              {c.matter_number ?? "—"}
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-900 max-w-xs truncate">
                              {c.title}
                            </td>
                            <td className="px-6 py-4">
                              <CaseTypeBadge caseType={c.case_type} />
                            </td>
                            <td className="px-6 py-4">
                              <CaseStatusBadge status={c.status} />
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                              {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                            </td>
                            <td className="px-6 py-4">
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card.Body>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <Card.Body className="py-12 text-center text-gray-600 space-y-3">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <h3 className="font-medium text-gray-900">No cases found</h3>
              <p className="text-sm">
                {Object.keys(params).length
                  ? "Try clearing the filters above."
                  : "Get started by creating your first case."}
              </p>
              <div className="pt-2">
                <Link to="/admin/cases/create">
                  <Button variant="primary">Create Case</Button>
                </Link>
              </div>
            </Card.Body>
          </Card>
        )}

        <ConfirmDialog
          open={confirmDelete.open}
          title="Delete case?"
          description="This will permanently delete the case and all associated events. This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDeleteCase}
          onCancel={() => setConfirmDelete({ open: false, caseId: null })}
        />
      </div>
    </AdminLayout>
  );
};

export default CaseList;
