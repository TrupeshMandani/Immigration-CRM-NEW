import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../common/Button";
import applicantTaskService from "../../services/applicantTaskService";

// restrictedAllowed: true  → visible to restricted (registered) applicants.
// restrictedAllowed: false → premium; hidden until the applicant is fully
//                            activated (status 'active').
const navItems = [
  {
    label: "Dashboard",
    to: "/applicant/dashboard",
    icon: DashboardIcon,
    matchPrefixes: ["/applicant/dashboard"],
    restrictedAllowed: true,
  },
  {
    label: "Profile",
    to: "/applicant/profile",
    icon: UserIcon,
    matchPrefixes: ["/applicant/profile"],
    restrictedAllowed: true,
  },
  {
    label: "Documents",
    to: "/applicant/documents",
    icon: FolderIcon,
    matchPrefixes: ["/applicant/documents"],
    restrictedAllowed: true,
  },
  {
    label: "Tasks",
    to: "/applicant/tasks",
    icon: TasksIcon,
    matchPrefixes: ["/applicant/tasks"],
    restrictedAllowed: true,
  },
  {
    label: "University Recommendations",
    to: "/applicant/university-recommendations",
    icon: UniversityIcon,
    matchPrefixes: ["/applicant/university-recommendations"],
    restrictedAllowed: false,
  },
  {
    label: "Retainer Agreement",
    to: "/applicant/retainer",
    icon: RetainerIcon,
    matchPrefixes: ["/applicant/retainer"],
    restrictedAllowed: false,
  },
  {
    label: "Invoices & Payments",
    to: "/applicant/pay-invoice",
    icon: InvoiceIcon,
    matchPrefixes: ["/applicant/pay-invoice"],
    restrictedAllowed: false,
  },
  {
    label: "AI Assistant",
    to: "/applicant/assistant",
    icon: AssistantIcon,
    matchPrefixes: ["/applicant/assistant"],
    restrictedAllowed: false,
  },
  {
    label: "Change Password",
    to: "/applicant/change-password",
    icon: LockIcon,
    matchPrefixes: ["/applicant/change-password"],
    restrictedAllowed: true,
  },
];

function DashboardIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 13h8V3H3zm10 8h8V3h-8zm-10 0h8v-6H3z"
      />
    </svg>
  );
}

function UserIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function FolderIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V7z"
      />
    </svg>
  );
}

function LockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v4h8z"
      />
    </svg>
  );
}

function UniversityIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 9.5l9-4.5 9 4.5-9 4.5-9-4.5z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M6 12v4.5c0 .6.34 1.15.88 1.42l5.12 2.56 5.12-2.56c.54-.27.88-.82.88-1.42V12"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 10l3 1.5 3-1.5"
      />
    </svg>
  );
}

function TasksIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 7l-2 2 2 2M15 7l2 2-2 2M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 15h6"
      />
    </svg>
  );
}

function RetainerIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12h6m-6 4h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6" />
    </svg>
  );
}

function InvoiceIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 22V12h6v10" />
    </svg>
  );
}

function AssistantIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}

const ApplicantLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [taskAlert, setTaskAlert] = useState(false);

  const isRestricted =
    user?.role === "applicant" && user?.status && user.status !== "active";

  const allowedRestrictedRoutes = useMemo(
    () =>
      new Set(
        navItems
          .filter((item) => item.restrictedAllowed)
          .flatMap((item) => item.matchPrefixes || [item.to])
      ),
    []
  );

  const currentPath = location.pathname;
  const restrictedViewOnly =
    isRestricted &&
    !Array.from(allowedRestrictedRoutes).some((path) =>
      currentPath.startsWith(path)
    );

  useEffect(() => {
    let cancelled = false;
    const fetchTaskAlert = async () => {
      if (!user?.aiKey) return;
      try {
        const list = await applicantTaskService.list(user.aiKey);
        if (cancelled) return;
        const hasNew = list.some(
          (task) => !(task.seenByApplicant ?? task.seenByApplicant) && task.status === "pending"
        );
        setTaskAlert(hasNew);
      } catch {
        if (!cancelled) {
          setTaskAlert(false);
        }
      }
    };
    fetchTaskAlert();
    return () => {
      cancelled = true;
    };
  }, [user?.aiKey]);

  useEffect(() => {
    if (currentPath.startsWith("/applicant/tasks")) {
      setTaskAlert(false);
    }
  }, [currentPath]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const renderNavLinks = (onNavigate) =>
    navItems.map((item) => {
      // Premium sections are hidden entirely for restricted applicants.
      if (isRestricted && !item.restrictedAllowed) return null;

      const prefixes = item.matchPrefixes || [item.to];
      const isActive = prefixes.some((prefix) => currentPath.startsWith(prefix));
      const Icon = item.icon;
      const disabled = false;
      const showTaskBadge = item.to === "/applicant/tasks" && taskAlert;

      const handleClick = (event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }

        const isStandardClick =
          event.button === 0 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.shiftKey;

        if (isStandardClick) {
          event.preventDefault();
          if (currentPath !== item.to) {
            navigate(item.to);
          } else {
            // Force re-render for same-route navigations (e.g., closing overlays)
            navigate(item.to, { replace: true });
          }
          onNavigate?.();
        }
      };

      return (
        <Link
          key={item.to}
          to={item.to}
          onClick={handleClick}
          className={`flex min-h-[40px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium leading-5 transition ${
            disabled
              ? "pointer-events-none bg-primary-800/50 text-primary-600"
              : isActive
              ? "bg-primary-800 text-primary-200 shadow-md"
              : "text-primary-400 hover:bg-primary-800 hover:text-primary-200"
          }`}
        >
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          {showTaskBadge && (
            <span className="ml-auto h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-primary-900" />
          )}
        </Link>
      );
    });

  return (
    <div className="h-screen bg-background">
      <div className="flex h-full overflow-hidden">
        <aside className="hidden h-full w-64 flex-shrink-0 flex-col border-r border-primary-800 bg-primary-900 p-6 md:flex">
          <div className="mb-8">
            <Link to="/applicant/dashboard" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-800 text-primary-200">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path d="M4 7.5L12 3l8 4.5M4 7.5V16.5L12 21l8-4.5V7.5M4 7.5l8 4.5 8-4.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 12V21" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-lg font-semibold text-primary-200">
                Immigration CRM
              </span>
            </Link>
          </div>

          <nav className="flex-1 space-y-2">{renderNavLinks()}</nav>

          <div className="mt-8 space-y-3 text-sm text-primary-400">
            <div>
              <p className="text-xs uppercase tracking-wide text-primary-600">
                Signed in as
              </p>
              <p className="mt-1 font-medium text-primary-200">
                {user?.username || user?.contactInfo?.name || "Applicant"}
              </p>
            </div>
            <button 
              className="w-full text-left text-sm font-medium text-red-500 hover:text-red-400" 
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </aside>

        <div
          className={`fixed inset-0 z-40 bg-primary-900/80 transition-opacity md:hidden ${
            mobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setMobileNavOpen(false)}
        ></div>
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-primary-900 p-6 shadow-lg transition md:hidden ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-8 flex items-center justify-between">
            <Link
              to="/applicant/dashboard"
              className="flex items-center gap-2"
              onClick={() => setMobileNavOpen(false)}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-800 text-primary-200">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path d="M4 7.5L12 3l8 4.5M4 7.5V16.5L12 21l8-4.5V7.5M4 7.5l8 4.5 8-4.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 12V21" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-lg font-semibold text-primary-200">
                Immigration CRM
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="rounded-md p-2 text-primary-400 hover:text-primary-200"
              aria-label="Close navigation"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="space-y-2">
            {renderNavLinks(() => setMobileNavOpen(false))}
          </nav>
          <div className="mt-6 space-y-3 text-sm text-primary-400">
            <div>
              <p className="text-xs uppercase tracking-wide text-primary-600">
                Signed in as
              </p>
              <p className="mt-1 font-medium text-primary-200">
                {user?.username || user?.contactInfo?.name || "Applicant"}
              </p>
            </div>
            <button 
              className="w-full text-left text-sm font-medium text-red-500 hover:text-red-400" 
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-primary-400/30 bg-primary-200 px-4 py-3 md:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-md p-2 text-primary-600 hover:bg-primary-400/20 hover:text-primary-900"
              aria-label="Open navigation"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-base font-semibold text-primary-900">
              Applicant Portal
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-medium text-red-500 hover:text-red-400"
            >
              Logout
            </button>
          </header>

          <main className="relative flex-1 overflow-y-auto bg-background px-4 py-6 md:px-8 md:py-10">
            {isRestricted && (
              <div className="mb-4 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                You have restricted access. You can manage your profile, documents and tasks. Premium sections unlock once your advisor grants you full access.
              </div>
            )}
            <div className={restrictedViewOnly ? "pointer-events-none opacity-40" : ""}>
              {children}
            </div>
            {restrictedViewOnly && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="pointer-events-auto max-w-md rounded-lg border border-sky-200 bg-white/95 px-6 py-4 text-center shadow-lg">
                  <h3 className="text-base font-semibold text-sky-800">
                    Full access required
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    This section unlocks once your advisor grants you full access. In the meantime, keep your profile, documents and tasks up to date.
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ApplicantLayout;
