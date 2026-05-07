import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { studentService } from "../../services/authService";
import AdminLayout from "../../components/layout/AdminLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import ViewToggle from "../../components/common/ViewToggle";
import StudentCard from "../../components/admin/StudentCard";
import StudentListItem from "../../components/admin/StudentListItem";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useViewMode } from "../../hooks/useViewMode";

const StudentList = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    studentId: null,
  });
  const [viewMode, setViewMode] = useViewMode(
    "studentList_viewMode",
    ["card", "list", "table"],
    "card"
  );

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const params = {};
        if (searchTerm) params.search = searchTerm;
        if (statusFilter) params.status = statusFilter;

        const data = await studentService.getAllStudents(params);
        setStudents(data);
      } catch (err) {
        console.error("Error fetching students:", err);
        setError("Failed to load students. Please try again later.");
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    fetchStudents();
  }, [searchTerm, statusFilter]);

  const handleStatusChange = async (id, nextStatus) => {
    try {
      if (nextStatus === "active") {
        await studentService.activateStudent(id);
      } else {
        await studentService.updateStudent(id, { status: "inactive" });
      }

      const data = await studentService.getAllStudents();
      setStudents(data);
    } catch (err) {
      console.error("Failed to update student status:", err);
      setError("Failed to update student status.");
    }
  };

  const handleDelete = (id) =>
    setConfirmDelete({ open: true, studentId: id });

  const confirmDeleteStudent = async () => {
    const id = confirmDelete.studentId;
    if (!id) return;
    try {
      await studentService.deleteStudent(id);
      setStudents((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      console.error("Failed to delete student:", err);
      setError("Unable to delete student. Please try again.");
    } finally {
      setConfirmDelete({ open: false, studentId: null });
    }
  };

  const cancelDelete = () =>
    setConfirmDelete({ open: false, studentId: null });

  if (initialLoad && loading) {
    return (
      <AdminLayout>
        <div className="flex h-96 items-center justify-center">
          <Loading size="lg" text="Loading students..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ---------- Page Header ---------- */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Students</h1>
            <p className="text-gray-600 mt-1">
              Manage and monitor all registered students in your system.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ViewToggle
              currentView={viewMode}
              onViewChange={setViewMode}
              views={["card", "list", "table"]}
              storageKey="studentList_viewMode"
            />
            <Link to="/admin/students/create">
              <Button variant="primary" icon="plus">
                Add Student
              </Button>
            </Link>
          </div>
        </div>

        {/* ---------- Filters ---------- */}
        <Card className="shadow-sm mb-8">
          <Card.Body>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
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
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("");
                  }}
                  className="w-full md:w-auto"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* ---------- Student Data ---------- */}
        {students.length > 0 ? (
          <>
            {viewMode === "card" && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {students.map((student) => (
                  <StudentCard key={student._id} student={student} />
                ))}
              </div>
            )}

            {viewMode === "list" && (
              <div className="space-y-4">
                {students.map((student) => (
                  <StudentListItem key={student._id} student={student} />
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
                          <th className="px-6 py-3 text-left font-medium">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left font-medium">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left font-medium">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left font-medium">
                            Created
                          </th>
                          <th className="px-6 py-3 text-left font-medium">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {students.map((student) => (
                          <tr
                            key={student._id}
                            onClick={() =>
                              navigate(`/admin/students/${student._id}`)
                            }
                            className="cursor-pointer transition hover:bg-gray-50"
                          >
                            <td className="px-6 py-4">
                              {student.contactInfo?.name ||
                                student.username ||
                                "Unknown"}
                            </td>
                            <td className="px-6 py-4">
                              {student.contactInfo?.email ||
                                student.email ||
                                "No email"}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                  student.status === "active"
                                    ? "bg-green-100 text-green-700"
                                    : student.status === "pending"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : student.status === "registered"
                                    ? "bg-sky-100 text-sky-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {student.status?.charAt(0).toUpperCase() +
                                  student.status?.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                              {student.createdAt
                                ? new Date(
                                    student.createdAt
                                  ).toLocaleDateString()
                                : "Unknown"}
                            </td>
                            <td className="px-6 py-4 space-x-2">
                              {student.status === "pending" && (
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleStatusChange(student._id, "active");
                                  }}
                                >
                                  Activate
                                </Button>
                              )}
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDelete(student._id);
                                }}
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
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
              <h3 className="font-medium text-gray-900">No students found</h3>
              <p className="text-sm">
                Get started by adding a new student record.
              </p>
              <div className="pt-2">
                <Link to="/admin/students/create">
                  <Button variant="primary">Create Student</Button>
                </Link>
              </div>
            </Card.Body>
          </Card>
        )}

        {error && (
          <div className="mt-8">
            <Card className="border border-red-200 bg-red-50">
              <Card.Body>
                <p className="text-sm text-red-700">{error}</p>
              </Card.Body>
            </Card>
          </div>
        )}

        <ConfirmDialog
          open={confirmDelete.open}
          title="Delete student?"
          description="Are you sure you want to delete this student? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDeleteStudent}
          onCancel={cancelDelete}
        />
      </div>
    </AdminLayout>
  );
};

export default StudentList;
