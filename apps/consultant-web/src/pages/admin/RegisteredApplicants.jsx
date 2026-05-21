import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AdminLayout from "../../components/layout/AdminLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import { useRegisteredApplicants, useActivateApplicant } from "../../hooks/useApplicants";

const RegisteredStudents = () => {
  const [search, setSearch] = useState("");

  const { data: students = [], isLoading, isError, refetch } = useRegisteredApplicants();
  const activateStudent = useActivateApplicant();

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      const name = student.contactInfo?.name ?? "";
      const email = student.contactInfo?.email ?? student.email ?? "";
      return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
    });
  }, [students, search]);

  const handleActivate = async (student) => {
    try {
      await activateStudent.mutateAsync(student._id);
      toast.success(`${student.contactInfo?.name || student.email} is now active.`);
    } catch (err) {
      toast.error(err?.message || "Unable to activate student. Please try again.");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Registered students</h1>
            <p className="text-sm text-gray-500">
              Students who created their accounts but are awaiting advisor activation.
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
                {filteredStudents.length} of {students.length} students shown
              </p>
            </div>
          </Card.Body>
        </Card>

        {isLoading ? (
          <Card>
            <Card.Body>
              <div className="flex h-48 items-center justify-center">
                <Loading size="md" text="Loading registered students..." />
              </div>
            </Card.Body>
          </Card>
        ) : isError ? (
          <Card className="border-red-200 bg-red-50">
            <Card.Body>
              <p className="text-sm text-red-600">Failed to load registered students.</p>
            </Card.Body>
          </Card>
        ) : filteredStudents.length === 0 ? (
          <Card>
            <Card.Body>
              <div className="py-12 text-center text-sm text-gray-500">
                No registered students at the moment.
              </div>
            </Card.Body>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Registered on</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Contact</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredStudents.map((student) => {
                    const createdAt = student.createdAt
                      ? new Date(student.createdAt).toLocaleString()
                      : "—";
                    return (
                      <tr key={student._id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                          <div className="font-medium">
                            {student.contactInfo?.name || "Unnamed student"}
                          </div>
                          <div className="text-xs text-gray-500">{student.username}</div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{createdAt}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                          <div>{student.contactInfo?.email || student.email}</div>
                          {student.contactInfo?.phone && (
                            <div className="text-xs text-gray-500">{student.contactInfo.phone}</div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/admin/students/${student._id}`}
                              className="text-sm font-medium text-primary hover:text-blue-700"
                            >
                              View profile
                            </Link>
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              loading={activateStudent.isPending}
                              disabled={activateStudent.isPending}
                              onClick={() => handleActivate(student)}
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

export default RegisteredStudents;
