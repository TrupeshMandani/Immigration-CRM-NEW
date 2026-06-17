import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AdminLayout from "../../components/layout/AdminLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import { useRegisteredApplicants, useActivateApplicant } from "../../hooks/useApplicants";

const RegisteredApplicants = () => {
  const [search, setSearch] = useState("");

  const { data: applicants = [], isLoading, isError, refetch } = useRegisteredApplicants();
  const activateApplicant = useActivateApplicant();

  const filteredApplicants = useMemo(() => {
    if (!search.trim()) return applicants;
    const query = search.trim().toLowerCase();
    return applicants.filter((applicant) => {
      const name = applicant.contactInfo?.name ?? "";
      const email = applicant.contactInfo?.email ?? applicant.email ?? "";
      return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
    });
  }, [applicants, search]);

  const handleActivate = async (applicant) => {
    try {
      await activateApplicant.mutateAsync(applicant._id);
      toast.success(`${applicant.contactInfo?.name || applicant.email} is now active.`);
    } catch (err) {
      toast.error(err?.message || "Unable to activate applicant. Please try again.");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Registered applicants</h1>
            <p className="text-sm text-gray-500">
              Applicants who created their accounts but are awaiting advisor activation.
            </p>
          </div>
          <Button variant="outline" onClick={refetch} disabled={isLoading}>
            Refresh list
          </Button>
        </div>

        <Card>
          <Card.Body>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <input
                type="text"
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:max-w-md"
              />
              <p className="text-xs text-gray-500">
                {filteredApplicants.length} of {applicants.length} applicants shown
              </p>
            </div>
          </Card.Body>
        </Card>

        {isLoading ? (
          <Card>
            <Card.Body>
              <div className="flex h-48 items-center justify-center">
                <Loading size="md" text="Loading registered applicants..." />
              </div>
            </Card.Body>
          </Card>
        ) : isError ? (
          <Card className="border-red-200 bg-red-50">
            <Card.Body>
              <p className="text-sm text-red-600">Failed to load registered applicants.</p>
            </Card.Body>
          </Card>
        ) : filteredApplicants.length === 0 ? (
          <Card>
            <Card.Body>
              <div className="py-12 text-center text-sm text-gray-500">
                No registered applicants at the moment.
              </div>
            </Card.Body>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Applicant</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Registered on</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Contact</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredApplicants.map((applicant) => {
                    const createdAt = applicant.createdAt
                      ? new Date(applicant.createdAt).toLocaleString()
                      : "—";
                    return (
                      <tr key={applicant._id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                          <div className="font-medium">
                            {applicant.contactInfo?.name || "Unnamed applicant"}
                          </div>
                          <div className="text-xs text-gray-500">{applicant.username}</div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{createdAt}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                          <div>{applicant.contactInfo?.email || applicant.email}</div>
                          {applicant.contactInfo?.phone && (
                            <div className="text-xs text-gray-500">{applicant.contactInfo.phone}</div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/admin/applicants/${applicant._id}`}
                              className="text-sm font-medium text-primary hover:text-blue-700"
                            >
                              View profile
                            </Link>
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              loading={activateApplicant.isPending}
                              disabled={activateApplicant.isPending}
                              onClick={() => handleActivate(applicant)}
                            >
                              Activate
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default RegisteredApplicants;
