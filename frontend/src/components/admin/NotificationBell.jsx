import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock10,
  Loader2,
} from "lucide-react";
import { taskService } from "../../services/taskService";
import { useSocket } from "../../hooks/useSocket";

const statusStyles = {
  verified: {
    label: "Verified",
    icon: CheckCircle2,
    classes: "text-emerald-600",
  },
  failed: {
    label: "Needs attention",
    icon: AlertTriangle,
    classes: "text-rose-600",
  },
  pending: {
    label: "Pending review",
    icon: Clock10,
    classes: "text-amber-600",
  },
};

const buttonSizes = {
  md: "h-11 w-11",
  sm: "h-9 w-9",
};

const NotificationBell = ({ className = "", size = "md" }) => {
  const { socket } = useSocket() || {};
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");
  const bellRef = useRef(null);
  const dropdownRef = useRef(null);
  const hasOpenedRef = useRef(false);
  const [dropdownStyle, setDropdownStyle] = useState({ top: 0, left: 0, width: 320 });

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await taskService.list({
        scope: "notifications",
        limit: 10,
      });
      const items = Array.isArray(data.tasks) ? data.tasks : [];
      setNotifications(items);
      setUnreadCount(
        Number.isFinite(data?.meta?.unread)
          ? data.meta.unread
          : items.filter((task) => !task.isRead).length
      );
      setError("");
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError("Unable to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!socket) return undefined;
    const handleTaskEvent = () => {
      fetchNotifications();
    };
    socket.on("task:created", handleTaskEvent);
    socket.on("task:updated", handleTaskEvent);
    return () => {
      socket.off("task:created", handleTaskEvent);
      socket.off("task:updated", handleTaskEvent);
    };
  }, [socket, fetchNotifications]);

  useEffect(() => {
    const handleClick = (event) => {
      if (
        !open ||
        dropdownRef.current?.contains(event.target) ||
        bellRef.current?.contains(event.target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

useEffect(() => {
  if (!open && hasOpenedRef.current) {
    hasOpenedRef.current = false;
    fetchNotifications();
  }
}, [open, fetchNotifications]);

useEffect(() => {
  if (!open) return;
  const unreadIds = notifications.filter((task) => !task.isRead).map((task) => task.id);
  if (!unreadIds.length) return;
  taskService
    .markNotificationsRead(unreadIds)
    .then(() => {
      setNotifications((prev) =>
        prev.map((task) =>
          unreadIds.includes(task.id) ? { ...task, isRead: true } : task
        )
      );
      setUnreadCount((prev) => Math.max(prev - unreadIds.length, 0));
    })
    .catch((err) => console.warn("Failed to mark notifications read:", err));
}, [open, notifications]);

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      if (!next) return next;
      hasOpenedRef.current = true;
      const rect = bellRef.current?.getBoundingClientRect();
      if (rect) {
        const width = 320;
        const maxLeft = window.innerWidth - width - 16;
        const desiredLeft = rect.right - width;
        setDropdownStyle({
          top: rect.bottom + 12,
          left: Math.max(16, Math.min(desiredLeft, maxLeft)),
          width,
        });
      }
      return next;
    });
  };

  const handleNotificationClick = (task) => {
    if (!task?.id) return;
    if (!task.isRead) {
      taskService
        .markNotificationsRead([task.id])
        .then(() => {
          setNotifications((prev) =>
            prev.map((item) =>
              item.id === task.id ? { ...item, isRead: true } : item
            )
          );
          setUnreadCount((prev) => Math.max(prev - 1, 0));
        })
        .catch((err) => console.warn("Failed to mark notifications read:", err));
    }

    const search = new URLSearchParams();
    search.set("taskId", task.id);
    if (task.documentId) {
      search.set("docId", task.documentId);
    }
    setOpen(false);
    navigate(`/admin/tasks?${search.toString()}`);
  };

  const renderNotification = (task) => {
    const statusKey = task.verificationStatus || task.status || "pending";
    const config = statusStyles[statusKey] || statusStyles.pending;
    const Icon = config.icon;
    const timestamp = task.uploadTimestamp || task.createdAt;
    return (
      <li
        key={task.id}
        className="flex flex-col gap-1 rounded-xl border border-neutral-100 bg-white/80 p-3 text-sm shadow-sm transition hover:bg-neutral-50"
      >
        <button
          type="button"
          className="flex flex-col gap-1 text-left"
          onClick={() => handleNotificationClick(task)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-900">
                {task.documentField || "Document"}
              </p>
              <p className="truncate text-xs text-neutral-500">
                {task.studentName || "Student"}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium ${config.classes}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {config.label}
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            {timestamp ? new Date(timestamp).toLocaleString() : "No timestamp"}
          </p>
          {task.verificationReason && (
            <p className="text-xs text-neutral-600">
              {task.verificationReason}
            </p>
          )}
        </button>
      </li>
    );
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        ref={bellRef}
        onClick={toggleOpen}
        className={`relative inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition hover:border-primary/40 hover:text-primary ${
          buttonSizes[size] || buttonSizes.md
        }`}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: dropdownStyle.top,
              left: Math.max(dropdownStyle.left, 16),
              width: dropdownStyle.width,
              zIndex: 2000,
            }}
            className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl ring-1 ring-black/5"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-neutral-900">
                Notifications
              </p>
              <Link
                to="/admin/tasks"
                className="text-xs font-medium text-primary hover:text-blue-700"
                onClick={() => setOpen(false)}
              >
                View tasks
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-6 text-sm text-neutral-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading
              </div>
            ) : error ? (
              <p className="py-4 text-sm text-rose-600">{error}</p>
            ) : notifications.length ? (
              <ul className="space-y-2">{notifications.map(renderNotification)}</ul>
            ) : (
              <div className="flex flex-col items-center gap-2 py-4 text-center text-sm text-neutral-500">
                <Bell className="h-5 w-5 text-neutral-400" />
                <p>You're all caught up.</p>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

export default NotificationBell;
