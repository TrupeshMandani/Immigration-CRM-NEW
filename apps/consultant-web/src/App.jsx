import { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./utils/ProtectedRoute";
import Loading from "./components/common/Loading";

// Public pages (small — kept static)
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import About from "./pages/About";
import Services from "./pages/Services";
import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";
import Faq from "./pages/Faq";

// Student pages — lazy (Prompt 19 scope)
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const StudentProfile = lazy(() => import("./pages/student/StudentProfile"));
const StudentDocuments = lazy(() => import("./pages/student/Documents"));
const StudentTasks = lazy(() => import("./pages/student/Tasks"));
const ChangePassword = lazy(() => import("./pages/student/ChangePassword"));
const UniversityRecommendation = lazy(() =>
  import("./pages/student/UniversityRecommendations")
);

// Admin pages — lazy
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const StudentList = lazy(() => import("./pages/admin/StudentList"));
const CreateStudent = lazy(() => import("./pages/admin/CreateStudent"));
const ContactRequests = lazy(() => import("./pages/admin/ContactRequests"));
const StudentDetail = lazy(() => import("./pages/admin/StudentDetail"));
const RegisteredStudents = lazy(() =>
  import("./pages/admin/RegisteredStudents")
);
const TasksPage = lazy(() => import("./pages/admin/Tasks"));
const NotificationsPage = lazy(() => import("./pages/admin/Notifications"));
const AIAssistantPage = lazy(() => import("./pages/admin/AIAssistant"));

const PageFallback = () => (
  <div className="flex h-screen items-center justify-center">
    <Loading size="lg" />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/about" element={<About />} />
              <Route path="/services" element={<Services />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Student Routes */}
              <Route
                path="/student/dashboard"
                element={
                  <ProtectedRoute requireStudent>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/profile"
                element={
                  <ProtectedRoute requireStudent>
                    <StudentProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/documents"
                element={
                  <ProtectedRoute requireStudent>
                    <StudentDocuments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/tasks"
                element={
                  <ProtectedRoute requireStudent>
                    <StudentTasks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/change-password"
                element={
                  <ProtectedRoute requireStudent>
                    <ChangePassword />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/university-recommendations"
                element={
                  <ProtectedRoute requireStudent>
                    <UniversityRecommendation />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/requests"
                element={
                  <ProtectedRoute requireAdmin>
                    <ContactRequests />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/students/registered"
                element={
                  <ProtectedRoute requireAdmin>
                    <RegisteredStudents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/students"
                element={
                  <ProtectedRoute requireAdmin>
                    <StudentList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/student-profiles"
                element={
                  <ProtectedRoute requireAdmin>
                    <StudentList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/students/create"
                element={
                  <ProtectedRoute requireAdmin>
                    <CreateStudent />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/students/:id"
                element={
                  <ProtectedRoute requireAdmin>
                    <StudentDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/tasks"
                element={
                  <ProtectedRoute requireAdmin>
                    <TasksPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/assistant"
                element={
                  <ProtectedRoute requireAdmin>
                    <AIAssistantPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/notifications"
                element={
                  <ProtectedRoute requireAdmin>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
