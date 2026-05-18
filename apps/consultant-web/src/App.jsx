import { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import RouteGuard from "./components/auth/RouteGuard";
import Loading from "./components/common/Loading";

// Public pages (kept static — small)
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import About from "./pages/About";
import Services from "./pages/Services";
import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";
import Faq from "./pages/Faq";
import Forbidden from "./pages/Forbidden";
import NotFound from "./pages/NotFound";

// ── Student pages — lazy ──────────────────────────────────────────────────────
const StudentDashboard      = lazy(() => import("./pages/student/StudentDashboard"));
const StudentProfile        = lazy(() => import("./pages/student/StudentProfile"));
const StudentDocuments      = lazy(() => import("./pages/student/Documents"));
const StudentTasks          = lazy(() => import("./pages/student/Tasks"));
const ChangePassword        = lazy(() => import("./pages/student/ChangePassword"));
const UniversityRecommendation = lazy(() => import("./pages/student/UniversityRecommendations"));
const Retainer              = lazy(() => import("./pages/student/Retainer"));
const PayInvoice            = lazy(() => import("./pages/student/PayInvoice"));

// ── Admin pages — lazy ────────────────────────────────────────────────────────
const AdminDashboard        = lazy(() => import("./pages/admin/AdminDashboard"));
const StudentList           = lazy(() => import("./pages/admin/StudentList"));
const CreateStudent         = lazy(() => import("./pages/admin/CreateStudent"));
const ContactRequests       = lazy(() => import("./pages/admin/ContactRequests"));
const StudentDetail         = lazy(() => import("./pages/admin/StudentDetail"));
const RegisteredStudents    = lazy(() => import("./pages/admin/RegisteredStudents"));
const TasksPage             = lazy(() => import("./pages/admin/Tasks"));
const NotificationsPage     = lazy(() => import("./pages/admin/Notifications"));
const AIAssistantPage       = lazy(() => import("./pages/admin/AIAssistant"));

const PageFallback = () => (
  <div className="flex h-screen items-center justify-center">
    <Loading size="lg" />
  </div>
);

// Layout-level guards — one check covers all child routes.
const StudentRoutes = () => (
  <RouteGuard allowedRoles={["student"]} />
);
const AdminRoutes = () => (
  <RouteGuard allowedRoles={["admin", "senior", "junior"]} />
);

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* ── Public routes ─────────────────────────────────────────── */}
            <Route path="/"          element={<Landing />} />
            <Route path="/about"     element={<About />} />
            <Route path="/services"  element={<Services />} />
            <Route path="/pricing"   element={<Pricing />} />
            <Route path="/contact"   element={<Contact />} />
            <Route path="/faq"       element={<Faq />} />
            <Route path="/login"     element={<Login />} />
            <Route path="/register"  element={<Register />} />
            <Route path="/403"       element={<Forbidden />} />
            <Route path="/404"       element={<NotFound />} />

            {/* ── Student routes ────────────────────────────────────────── */}
            <Route element={<StudentRoutes />}>
              <Route path="/student/dashboard"               element={<StudentDashboard />} />
              <Route path="/student/profile"                 element={<StudentProfile />} />
              <Route path="/student/documents"               element={<StudentDocuments />} />
              <Route path="/student/tasks"                   element={<StudentTasks />} />
              <Route path="/student/change-password"         element={<ChangePassword />} />
              <Route path="/student/university-recommendations" element={<UniversityRecommendation />} />
              <Route path="/student/retainer"                element={<Retainer />} />
              <Route path="/student/pay-invoice"             element={<PayInvoice />} />
            </Route>

            {/* ── Admin routes ──────────────────────────────────────────── */}
            <Route element={<AdminRoutes />}>
              <Route path="/admin/dashboard"             element={<AdminDashboard />} />
              <Route path="/admin/requests"              element={<ContactRequests />} />
              <Route path="/admin/students/registered"   element={<RegisteredStudents />} />
              <Route path="/admin/students"              element={<StudentList />} />
              <Route path="/admin/student-profiles"      element={<StudentList />} />
              <Route path="/admin/students/create"       element={<CreateStudent />} />
              <Route path="/admin/students/:id"          element={<StudentDetail />} />
              <Route path="/admin/tasks"                 element={<TasksPage />} />
              <Route path="/admin/assistant"             element={<AIAssistantPage />} />
              <Route path="/admin/notifications"         element={<NotificationsPage />} />
            </Route>

            {/* ── Catch-all ─────────────────────────────────────────────── */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </div>
      </Router>
  );
}

export default App;
