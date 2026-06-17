import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../common/Button";
import AppSplitterLayout from "./AppSplitterLayout";
import { useSocket } from "../../hooks/useSocket";
import { taskService } from "../../services/taskService";
import { useNotifications } from "../../context/NotificationContext";

const navItems = [
  { label: "Dashboard", to: "/admin/dashboard", icon: DashboardIcon },
  { label: "Contact Requests", to: "/admin/requests", icon: MailIcon },
  {
    label: "Registered Applicants",
    to: "/admin/applicants/registered",
    matchPrefixes: ["/admin/applicants/registered"],
    icon: ClipboardIcon,
  },
  {
    label: "Applicant Profiles",
    to: "/admin/applicants",
    matchPrefixes: [
      "/admin/applicants",
      "/admin/applicants/",
    ],
    excludePrefixes: ["/admin/applicants/registered", "/admin/applicants/create"],
    icon: UsersIcon,
  },
  {
    label: "Cases / Matters",
    to: "/admin/cases",
    matchPrefixes: ["/admin/cases"],
    excludePrefixes: ["/admin/cases/create"],
    icon: FolderIcon,
  },
  { label: "Tasks", to: "/admin/tasks", icon: TasksIcon },
  { label: "Notifications", to: "/admin/notifications", icon: BellIcon },
  {
    label: "AI Assistant",
    to: "/admin/assistant",
    matchPrefixes: ["/admin/assistant"],
    icon: SparklesIcon,
  },
  { label: "Create Applicant", to: "/admin/applicants/create", icon: PlusIcon },
];

function DashboardIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 15h7v6H3z"
      />
    </svg>
  );
}

function MailIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function UsersIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17 20h5V8l-9-5-9 5v12h5"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 20v-6a3 3 0 016 0v6"
      />
    </svg>
  );
}

function PlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 5v14M5 12h14"
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

function BellIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 17h5l-1.405-1.405A2 2 0 0118 14.158V11a6 6 0 00-12 0v3.159c0 .53-.211 1.039-.586 1.414L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

function SparklesIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M6 17l.8 2.2L9 20l-2.2.8L6 23l-.8-2.2L3 20l2.2-.8L6 17zM17 14l.6 1.6L19 16l-1.4.4L17 18l-.6-1.6L15 16l1.4-.4L17 14z"
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
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  );
}

function ClipboardIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 5h6M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 00-2 2v11a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 11h6M9 15h6"
      />
    </svg>
  );
}

const AdminLayout = ({
  children,
  secondary = null,
  showSecondary: showSecondaryProp,
  splitterStorageKey = "admin-layout-splitter",
  splitterInitialSizes,
  splitterMinSizes,
  topbar = null,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const socketContext = useSocket() || {};
  const { socket } = socketContext;
  const { unreadCount: unreadNotifications = 0 } = useNotifications() || {};
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [taskAlert, setTaskAlert] = useState(false);
  const isTasksRoute = location.pathname.startsWith("/admin/tasks");
  const isNotificationsRoute = location.pathname.startsWith(
    "/admin/notifications"
  );

  useEffect(() => {
    let cancelled = false;
    const bootstrapTasks = async () => {
      try {
        const data = await taskService.list({
          type: "ai-verification",
          status: "pending",
          limit: 1,
        });
        if (
          !cancelled &&
          !isTasksRoute &&
          Array.isArray(data.tasks) &&
          data.tasks.length
        ) {
          setTaskAlert(true);
        }
      } catch {
        /* ignore */
      }
    };
    bootstrapTasks();
    return () => {
      cancelled = true;
    };
  }, [isTasksRoute]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const shouldSignal = (task = {}) => {
      const status = (
        task.status ||
        task.verificationStatus ||
        ""
      ).toLowerCase();
      if (!["pending", "failed"].includes(status)) {
        return false;
      }
      if (task.notificationDeleted || task.notificationMuted === true) {
        return false;
      }
      return true;
    };

    const handleTaskCreated = (task = {}) => {
      if (shouldSignal(task)) {
        if (!isTasksRoute) {
          setTaskAlert(true);
        }
      }
    };

    const handleTaskUpdated = (task = {}) => {
      if (shouldSignal(task)) {
        if (!isTasksRoute) {
          setTaskAlert(true);
        }
      }
    };

    socket.on("task:created", handleTaskCreated);
    socket.on("task:updated", handleTaskUpdated);
    return () => {
      socket.off("task:created", handleTaskCreated);
      socket.off("task:updated", handleTaskUpdated);
    };
  }, [socket, isTasksRoute, isNotificationsRoute]);

  useEffect(() => {
    if (isTasksRoute) {
      setTaskAlert(false);
    }
  }, [isTasksRoute]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const renderNavLinks = (onNavigate) =>
    navItems.map((item) => {
      const prefixes = item.matchPrefixes || [item.to];
      const isActive = prefixes.some((prefix) => {
        if (!location.pathname.startsWith(prefix)) {
          return false;
        }
        if (item.excludePrefixes) {
          return !item.excludePrefixes.some((exclude) =>
            location.pathname.startsWith(exclude)
          );
        }
        return true;
      });
      const Icon = item.icon;
      const showTaskAlert =
        item.to === "/admin/tasks" && taskAlert && !isTasksRoute;
      const showNotificationAlert =
        item.to === "/admin/notifications" &&
        unreadNotifications > 0 &&
        !isNotificationsRoute;
      const showAlert = showTaskAlert || showNotificationAlert;
      return (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => onNavigate?.()}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
            isActive
              ? "bg-primary-800 text-primary-200 shadow-md"
              : "text-primary-400 hover:bg-primary-800 hover:text-primary-200"
          }`}
        >
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 truncate">{item.label}</span>
          {showAlert ? (
            <span
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red-500 ring-2 ring-primary-900"
              aria-hidden="true"
            />
          ) : null}
        </Link>
      );
    });

  const showSecondary = showSecondaryProp ?? Boolean(secondary);

  const desktopSidebar = (
    <div className="flex h-full flex-col border-r border-primary-800 bg-primary-900 p-6">
      <div className="mb-8">
        <Link to="/admin/dashboard" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-800 text-primary-200">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 7.5L12 3l8 4.5M4 7.5V16.5L12 21l8-4.5V7.5M4 7.5l8 4.5 8-4.5"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 12V21"
              />
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
            {user?.username || "Admin"}
          </p>
        </div>
        <button 
          className="w-full text-left text-sm font-medium text-red-500 hover:text-red-400" 
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </div>
  );

  const secondaryPanel = showSecondary ? (
    <div className="h-full border-r border-primary-400/30 bg-primary-200">{secondary}</div>
  ) : null;

  const desktopMainContent = (
    <div className="flex h-full flex-col bg-background">
      {topbar ? (
        <div className="shrink-0 px-6 pt-6">
          <div className="min-h-[28px] flex-1">{topbar}</div>
        </div>
      ) : null}
      <div className="flex-1 overflow-y-auto px-8 py-10">{children}</div>
    </div>
  );

  return (
    <div className="h-screen bg-background">
      <div className="flex h-full overflow-hidden">
        {/* Mobile sidebar */}
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
              to="/admin/dashboard"
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 7.5L12 3l8 4.5M4 7.5V16.5L12 21l8-4.5V7.5M4 7.5l8 4.5 8-4.5"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 12V21"
                  />
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
              aria-label="Close sidebar"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6 18L18 6M6 6l12 12"
                />
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
                {user?.username || "Admin"}
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
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <span className="text-base font-semibold text-primary-900">
              Admin Panel
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-medium text-red-500 hover:text-red-400"
            >
              Logout
            </button>
          </header>

          <div className="flex flex-1 overflow-hidden">
            <div className="hidden h-full w-full md:flex">
              <AppSplitterLayout
                left={desktopSidebar}
                secondary={secondaryPanel}
                showSecondary={showSecondary}
                storageKey={splitterStorageKey}
                initialSizes={splitterInitialSizes}
                minSizes={splitterMinSizes}
              >
                {desktopMainContent}
              </AppSplitterLayout>
            </div>
            <div className="flex flex-1 flex-col  md:hidden">
              {topbar ? (
                <div className="shrink-0 border-b border-primary-400/30 bg-primary-200">
                  {topbar}
                </div>
              ) : null}
              <main className="flex-1 overflow-y-auto bg-background px-4 py-6">
                {children}
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
