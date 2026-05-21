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
const ApplicantDashboard      = lazy(() => import("./pages/student/ApplicantDashboard"));
const ApplicantProfile        = lazy(() => import("./pages/student/ApplicantProfile"));
const ApplicantDocuments      = lazy(() => import("./pages/student/Documents"));
const ApplicantTasks          = lazy(() => import("./pages/student/Tasks"));
const ChangePassword        = lazy(() => import("./pages/student/ChangePassword"));
const UniversityRecommendation = lazy(() => import("./pages/student/UniversityRecommendations"));
const Retainer              = lazy(() => import("./pages/student/Retainer"));
const PayInvoice            = lazy(() => import("./pages/student/PayInvoice"));

// ── Admin pages — lazy ────────────────────────────────────────────────────────
const AdminDashboard        = lazy(() => import("./pages/admin/AdminDashboard"));
const ApplicantList           = lazy(() => import("./pages/admin/ApplicantList"));
const CreateApplicant         = lazy(() => import("./pages/admin/CreateApplicant"));
const ContactRequests       = lazy(() => import("./pages/admin/ContactRequests"));
const ApplicantDetail         = lazy(() => import("./pages/admin/ApplicantDetail"));
const RegisteredApplicants    = lazy(() => import("./pages/admin/RegisteredApplicants"));
const TasksPage             = lazy(() => import("./pages/admin/Tasks"));
const NotificationsPage     = lazy(() => import("./pages/admin/Notifications"));
const AIAssistantPage       = lazy(() => import("./pages/admin/AIAssistant"));

const PageFallback = () => (
  <div className="flex h-screen items-center justify-center">
    <Loading size="lg" />
  </div>
);

// Layout-level guards — one check covers all child routes.
const ApplicantRoutes = () => (
  <RouteGuard allowedRoles={["applicant"]} />
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
            <Route element={<ApplicantRoutes />}>
              <Route path="/applicant/dashboard"               element={<ApplicantDashboard />} />
              <Route path="/applicant/profile"                 element={<ApplicantProfile />} />
              <Route path="/applicant/documents"               element={<ApplicantDocuments />} />
              <Route path="/applicant/tasks"                   element={<ApplicantTasks />} />
              <Route path="/applicant/change-password"         element={<ChangePassword />} />
              <Route path="/applicant/university-recommendations" element={<UniversityRecommendation />} />
              <Route path="/applicant/retainer"                element={<Retainer />} />
              <Route path="/applicant/pay-invoice"             element={<PayInvoice />} />
            </Route>

            {/* ── Admin routes ──────────────────────────────────────────── */}
            <Route element={<AdminRoutes />}>
              <Route path="/admin/dashboard"             element={<AdminDashboard />} />
              <Route path="/admin/requests"              element={<ContactRequests />} />
              <Route path="/admin/applicants/registered"   element={<RegisteredApplicants />} />
              <Route path="/admin/applicants"              element={<ApplicantList />} />
              <Route path="/admin/student-profiles"      element={<ApplicantList />} />
              <Route path="/admin/applicants/create"       element={<CreateApplicant />} />
              <Route path="/admin/applicants/:id"          element={<ApplicantDetail />} />
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
