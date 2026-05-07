import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import Toast from "../../components/common/Toast";
import { studentService } from "../../services/authService";

const RegisteredStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [activatingId, setActivatingId] = useState(null);

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      const name = student.contactInfo?.name || "";
      const email = student.contactInfo?.email || student.email || "";
      return (
        name.toLowerCase().includes(query) || email.toLowerCase().includes(query)
      );
    });
  }, [students, search]);

  const fetchStudents = async () => {
    setLoading(true);
    setError("");

    try {
      const list = await studentService.getRegisteredStudents();
      setStudents(list || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load registered students."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  const closeToast = () => setToast((prev) => ({ ...prev, show: false }));

  const handleActivate = async (student) => {
    try {
      setActivatingId(student._id);
      await studentService.activateStudent(student._id);
      showToast(`${student.contactInfo?.name || student.email} is now active.`);
      setStudents((prev) => prev.filter((item) => item._id !== student._id));
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          "Unable to activate student. Please try again.",
        "error"
      );
    } finally {
      setActivatingId(null);
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
          <Button variant="outline" onClick={fetchStudents} disabled={loading}>
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
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:max-w-md"
              />
              <p className="text-xs text-gray-500">
                {filteredStudents.length} of {students.length} students shown
              </p>
            </div>
          </Card.Body>
        </Card>

        {loading ? (
          <Card>
            <Card.Body>
              <div className="flex h-48 items-center justify-center">
                <Loading size="md" text="Loading registered students..." />
              </div>
            </Card.Body>
          </Card>
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
            <Card.Body>
              <p className="text-sm text-red-600">{error}</p>
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
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Registered on
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Contact
                    </th>
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
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                          {createdAt}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                          <div>{student.contactInfo?.email || student.email}</div>
                          {student.contactInfo?.phone && (
                            <div className="text-xs text-gray-500">
                              {student.contactInfo.phone}
                            </div>
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
                              loading={activatingId === student._id}
                              disabled={activatingId === student._id}
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

        <Toast
          show={toast.show}
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      </div>
    </AdminLayout>
  );
};

export default RegisteredStudents;
