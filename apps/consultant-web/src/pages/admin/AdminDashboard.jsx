import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AdminLayout from "../../components/layout/AdminLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import { useApplicants, usePendingContacts } from "../../hooks/useApplicants";
import UpcomingDeadlinesSidebar from "../../components/admin/UpcomingDeadlinesSidebar";

const StatCard = ({ to, label, value, iconWrapClass, iconClass, iconPath }) => (
  <Link
    to={to}
    className="group block rounded-xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
  >
    <Card className="h-full transition group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:border-primary-400/40">
      <Card.Body>
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconWrapClass}`}>
            <svg className={`w-5 h-5 ${iconClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
            </svg>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-primary-600">{label}</p>
            <p className="text-2xl font-semibold text-primary-900">{value}</p>
          </div>
          <svg
            className="ml-auto w-5 h-5 text-primary-400 opacity-0 -translate-x-1 transition group-hover:opacity-100 group-hover:translate-x-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Card.Body>
    </Card>
  </Link>
);

const AdminDashboard = () => {
  const { user } = useAuth();

  const { data: allApplicants = [], isLoading: applicantsLoading } = useApplicants();
  const { data: pendingContacts = [], isLoading: contactsLoading } = usePendingContacts();

  const loading = applicantsLoading || contactsLoading;

  const activeApplicants = allApplicants.filter((s) => s.status === "active");
  const recentApplicants = allApplicants.slice(0, 5);

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
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary-900">
            Welcome back, {user?.displayName || user?.name || user?.username?.split("@")[0]}!
          </h1>
          <p className="text-primary-600 mt-2">
            Here&apos;s an overview of your immigration business
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            to="/admin/applicants"
            label="Total Applicants"
            value={allApplicants.length}
            iconWrapClass="bg-primary-600/10"
            iconClass="text-primary-600"
            iconPath="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
          />
          <StatCard
            to="/admin/requests"
            label="Pending Contacts"
            value={pendingContacts.length}
            iconWrapClass="bg-yellow-100"
            iconClass="text-yellow-600"
            iconPath="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
          <StatCard
            to="/admin/applicants?status=active"
            label="Active Applicants"
            value={activeApplicants.length}
            iconWrapClass="bg-green-100"
            iconClass="text-green-600"
            iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </div>

        {/* Upcoming Deadlines */}
        <UpcomingDeadlinesSidebar />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Applicants */}
          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-primary-900">Recent Applicants</h2>
                <Link to="/admin/applicants">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>
            </Card.Header>
            <Card.Body>
              {recentApplicants.length > 0 ? (
                <div className="space-y-4">
                  {recentApplicants.map((applicant) => (
                    <Link
                      key={applicant.id}
                      to={`/admin/applicants/${applicant.id}`}
                      className="flex items-center justify-between rounded-lg border border-transparent bg-primary-200/30 p-3 transition hover:border-primary-400/40 hover:bg-primary-200"
                    >
                      <div>
                        <p className="font-medium text-primary-900">
                          {applicant.contactInfo?.name || applicant.username || "Unknown"}
                        </p>
                        <p className="text-sm text-primary-600">
                          {applicant.contactInfo?.email || applicant.email || "No email"}
                        </p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        applicant.status === "active" ? "bg-green-100 text-green-800"
                          : applicant.status === "pending" ? "bg-yellow-100 text-yellow-800"
                          : "bg-primary-400/20 text-primary-800"
                      }`}>
                        {applicant.status?.charAt(0).toUpperCase() + applicant.status?.slice(1)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-primary-600">No applicants found</p>
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
              <Link to="/admin/applicants" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  Manage Applicants
                </Button>
              </Link>
              <Link to="/admin/applicants/create" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create New Applicant
                </Button>
              </Link>
              <Link to="/admin/cases" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Manage Cases
                </Button>
              </Link>
              <Link to="/admin/tasks" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  View Tasks
                </Button>
              </Link>
              <Link to="/admin/calendar" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Deadline Calendar
                </Button>
              </Link>
              <Link to="/admin/assistant" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.83L3 20l1.09-3.27A7.94 7.94 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  AI Assistant
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
