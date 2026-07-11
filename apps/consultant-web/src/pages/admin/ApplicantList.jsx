import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AdminLayout from "../../components/layout/AdminLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import ViewToggle from "../../components/common/ViewToggle";
import ApplicantCard from "../../components/admin/ApplicantCard";
import ApplicantListItem from "../../components/admin/ApplicantListItem";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useViewMode } from "../../hooks/useViewMode";
import {
  useApplicants,
  useActivateApplicant,
  useDeleteApplicant,
} from "../../hooks/useApplicants";

const ApplicantList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    applicantId: null,
  });
  const [viewMode, setViewMode] = useViewMode(
    "applicantList_viewMode",
    ["card", "list", "table"],
    "card"
  );

  const params = {};
  if (searchTerm) params.search = searchTerm;
  if (statusFilter) params.status = statusFilter;

  const { data: applicants = [], isLoading, isError } = useApplicants(
    Object.keys(params).length ? params : undefined
  );
  const activateApplicant = useActivateApplicant();
  const deleteApplicant = useDeleteApplicant();

  const handleStatusChange = async (id, nextStatus) => {
    try {
      if (nextStatus === "active") {
        await activateApplicant.mutateAsync(id);
        toast.success("Applicant activated.");
      }
    } catch {
      toast.error("Failed to update applicant status.");
    }
  };

  const handleDelete = (id) => setConfirmDelete({ open: true, applicantId: id });

  const confirmDeleteApplicant = async () => {
    const id = confirmDelete.applicantId;
    if (!id) return;
    try {
      await deleteApplicant.mutateAsync(id);
      toast.success("Applicant deleted.");
    } catch {
      toast.error("Unable to delete applicant. Please try again.");
    } finally {
      setConfirmDelete({ open: false, applicantId: null });
    }
  };

  const cancelDelete = () => setConfirmDelete({ open: false, applicantId: null });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-96 items-center justify-center">
          <Loading size="lg" text="Loading applicants..." />
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
            <h1 className="text-3xl font-bold text-gray-900">Applicants</h1>
            <p className="text-gray-600 mt-1">
              Manage and monitor all registered applicants in your system.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ViewToggle
              currentView={viewMode}
              onViewChange={setViewMode}
              views={["card", "list", "table"]}
              storageKey="applicantList_viewMode"
            />
            <Link to="/admin/applicants/create">
              <Button variant="primary" icon="plus">Add Applicant</Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-sm mb-8">
          <Card.Body>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="registered">Registered</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => { setSearchTerm(""); setStatusFilter(""); }}
                  className="w-full md:w-auto"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>

        {isError && (
          <Card className="border border-red-200 bg-red-50 mb-6">
            <Card.Body>
              <p className="text-sm text-red-700">Failed to load applicants. Please refresh and try again.</p>
            </Card.Body>
          </Card>
        )}

        {/* Applicant Data */}
        {applicants.length > 0 ? (
          <>
            {viewMode === "card" && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {applicants.map((applicant) => (
                  <ApplicantCard key={applicant.id} applicant={applicant} />
                ))}
              </div>
            )}

            {viewMode === "list" && (
              <div className="space-y-4">
                {applicants.map((applicant) => (
                  <ApplicantListItem key={applicant.id} applicant={applicant} />
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
                          <th className="px-6 py-3 text-left font-medium">Name</th>
                          <th className="px-6 py-3 text-left font-medium">Email</th>
                          <th className="px-6 py-3 text-left font-medium">Status</th>
                          <th className="px-6 py-3 text-left font-medium">Created</th>
                          <th className="px-6 py-3 text-left font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {applicants.map((applicant) => (
                          <tr
                            key={applicant.id}
                            onClick={() => navigate(`/admin/applicants/${applicant.id}`)}
                            className="cursor-pointer transition hover:bg-gray-50"
                          >
                            <td className="px-6 py-4">
                              {applicant.contactInfo?.name || applicant.username || "Unknown"}
                            </td>
                            <td className="px-6 py-4">
                              {applicant.contactInfo?.email || applicant.email || "No email"}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                applicant.status === "active" ? "bg-green-100 text-green-700"
                                  : applicant.status === "pending" ? "bg-yellow-100 text-yellow-700"
                                  : applicant.status === "registered" ? "bg-sky-100 text-sky-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}>
                                {applicant.status?.charAt(0).toUpperCase() + applicant.status?.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                              {applicant.createdAt ? new Date(applicant.createdAt).toLocaleDateString() : "Unknown"}
                            </td>
                            <td className="px-6 py-4 space-x-2">
                              {applicant.status === "pending" && (
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleStatusChange(applicant.id, "active"); }}
                                >
                                  Activate
                                </Button>
                              )}
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleDelete(applicant.id); }}
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <h3 className="font-medium text-gray-900">No applicants found</h3>
              <p className="text-sm">Get started by adding a new applicant record.</p>
              <div className="pt-2">
                <Link to="/admin/applicants/create">
                  <Button variant="primary">Create Applicant</Button>
                </Link>
              </div>
            </Card.Body>
          </Card>
        )}

        <ConfirmDialog
          open={confirmDelete.open}
          title="Delete applicant?"
          description="Are you sure you want to delete this applicant? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDeleteApplicant}
          onCancel={cancelDelete}
        />
      </div>
    </AdminLayout>
  );
};

export default ApplicantList;
