import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AdminLayout from "../../components/layout/AdminLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import { useStudents, usePendingContacts } from "../../hooks/useStudents";

const AdminDashboard = () => {
  const { user } = useAuth();

  const { data: allStudents = [], isLoading: studentsLoading } = useStudents();
  const { data: pendingContacts = [], isLoading: contactsLoading } = usePendingContacts();

  const loading = studentsLoading || contactsLoading;

  const activeStudents = allStudents.filter((s) => s.status === "active");
  const recentStudents = allStudents.slice(0, 5);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-96 items-center justify-center">
          <Loading size="lg" text="Loading dashboard..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary-900">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-primary-600 mt-2">
            Here&apos;s an overview of your immigration business
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <Card.Body>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary-600/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-primary-600">Total Students</p>
                  <p className="text-2xl font-semibold text-primary-900">{allStudents.length}</p>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-primary-600">Pending Contacts</p>
                  <p className="text-2xl font-semibold text-primary-900">{pendingContacts.length}</p>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-primary-600">Active Students</p>
                  <p className="text-2xl font-semibold text-primary-900">{activeStudents.length}</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Students */}
          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-primary-900">Recent Students</h2>
                <Link to="/admin/students">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>
            </Card.Header>
            <Card.Body>
              {recentStudents.length > 0 ? (
                <div className="space-y-4">
                  {recentStudents.map((student) => (
                    <Link
                      key={student._id}
                      to={`/admin/students/${student._id}`}
                      className="flex items-center justify-between rounded-lg border border-transparent bg-primary-200/30 p-3 transition hover:border-primary-400/40 hover:bg-primary-200"
                    >
                      <div>
                        <p className="font-medium text-primary-900">
                          {student.contactInfo?.name || student.username || "Unknown"}
                        </p>
                        <p className="text-sm text-primary-600">
                          {student.contactInfo?.email || student.email || "No email"}
                        </p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        student.status === "active" ? "bg-green-100 text-green-800"
                          : student.status === "pending" ? "bg-yellow-100 text-yellow-800"
                          : "bg-primary-400/20 text-primary-800"
                      }`}>
                        {student.status?.charAt(0).toUpperCase() + student.status?.slice(1)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-primary-600">No students found</p>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Quick Actions */}
          <Card>
            <Card.Header>
              <h2 className="text-xl font-semibold text-primary-900">Quick Actions</h2>
            </Card.Header>
            <Card.Body className="space-y-3">
              <Link to="/admin/requests" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m-18 8h18M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Review Contact Requests
                </Button>
              </Link>
              <Link to="/admin/students" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  Manage Students
                </Button>
              </Link>
              <Link to="/admin/students/create" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create New Student
                </Button>
              </Link>
            </Card.Body>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
