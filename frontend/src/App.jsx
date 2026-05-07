import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./utils/ProtectedRoute";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import About from "./pages/About";
import Services from "./pages/Services";
import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";
import Faq from "./pages/Faq";

// Student Pages (will be created next)
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentProfile from "./pages/student/StudentProfile";
import StudentDocuments from "./pages/student/Documents";
import StudentTasks from "./pages/student/Tasks";
import ChangePassword from "./pages/student/ChangePassword";
import UniversityRecommendation from "./pages/student/UniversityRecommendations";

// Admin Pages (will be created next)
import AdminDashboard from "./pages/admin/AdminDashboard";
import StudentList from "./pages/admin/StudentList";
import CreateStudent from "./pages/admin/CreateStudent";
import ContactRequests from "./pages/admin/ContactRequests";
import StudentDetail from "./pages/admin/StudentDetail";
import RegisteredStudents from "./pages/admin/RegisteredStudents";
import TasksPage from "./pages/admin/Tasks";
import NotificationsPage from "./pages/admin/Notifications";
import AIAssistantPage from "./pages/admin/AIAssistant";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background">
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
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
