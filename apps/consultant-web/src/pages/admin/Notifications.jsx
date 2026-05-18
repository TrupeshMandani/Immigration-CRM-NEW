// NOTIFICATION PIPELINE — REST (Postgres `notifications` table)
// This inbox reads from GET /api/notifications and marks items read via
// POST /api/notifications/:id/read. It shows system-level notifications stored in
// Postgres — NOT the task-scoped pipeline used by the NotificationBell.
// See: src/components/admin/NotificationBell.jsx for the other pipeline.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import { useNotifications } from "../../context/NotificationContext";
import notificationService from "../../services/notificationService";

const filterTabs = [
  { label: "Unread", value: "UNREAD" },
  { label: "Read", value: "READ" },
  { label: "All", value: "ALL" },
];

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { setUnreadCount } = useNotifications() || {};
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("UNREAD");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [processingId, setProcessingId] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationService.list({ status: statusFilter, page });
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      const metaPayload = data.meta || {};
      setMeta({
        page: metaPayload.page || page,
        pages: metaPayload.pages || 1,
        total: metaPayload.total || 0,
      });
      if (statusFilter === "UNREAD" && typeof setUnreadCount === "function") {
        setUnreadCount(metaPayload.total || (Array.isArray(data.notifications) ? data.notifications.length : 0));
      }
      setError("");
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError("Unable to load notifications at the moment.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, setUnreadCount]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleOpenTask = (notification) => {
    if (!notification?.taskId) return;
    const search = new URLSearchParams();
    search.set("taskId", notification.taskId);
    navigate(`/admin/tasks?${search.toString()}`);
  };

  const handleMarkRead = async (notification) => {
    if (!notification?._id || notification.status === "READ") return;
    setProcessingId(notification._id);
    try {
      await notificationService.markRead(notification._id);
      setNotifications((prev) =>
        prev.map((item) =>
          item._id === notification._id ? { ...item, status: "READ", readAt: new Date().toISOString() } : item
        )
      );
      setUnreadCount?.((prev) => Math.max((prev || 0) - 1, 0));
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setUnreadCount?.(0);
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  };

  const handleRefresh = () => fetchNotifications();

  const renderBody = () => {
    if (loading) {
      return (
        <div className="py-16 text-center">
          <Loading size="md" text="Loading notifications..." />
        </div>
      );
    }

    if (error) {
      return (
        <div className="py-8 text-center text-sm text-rose-600">
          {error}
        </div>
      );
    }

    if (!notifications.length) {
      return (
        <div className="py-16 text-center text-sm text-neutral-500">
          You're all caught up.
        </div>
      );
    }

    return (
      <ul className="divide-y divide-neutral-200">
        {notifications.map((notification) => (
          <li
            key={notification._id}
            className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-neutral-900">
                {notification.actorName || "Student"}
              </p>
              <p className="text-xs text-neutral-500">
                {notification.taskTitle || "Task"}
              </p>
              <p className="mt-2 text-sm text-neutral-600">
                {notification.taskSummary || "Task completed"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                <span>
                  {notification.createdAt
                    ? new Date(notification.createdAt).toLocaleString()
                    : "Timestamp unknown"}
                </span>
                {notification.status === "UNREAD" && (
                  <span className="text-primary-600 font-medium">Pending review</span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!notification.taskId}
                onClick={() => {
                  if (!notification.taskId) return;
                  handleMarkRead(notification);
                  handleOpenTask(notification);
                }}
              >
                {notification.taskId ? "Open task" : "No task"}
              </Button>
              <Button
                variant={notification.status === "READ" ? "ghost" : "primary"}
                size="sm"
                onClick={() => handleMarkRead(notification)}
                disabled={processingId === notification._id}
              >
                {notification.status === "READ" ? "Read" : "Mark read"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6 lg:px-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">
              Inbox
            </p>
            <h1 className="text-3xl font-bold text-neutral-900">Notifications</h1>
            <p className="text-sm text-neutral-600">
              Track task completion alerts in real time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-neutral-200 bg-white p-1 text-xs font-semibold">
              {filterTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.value);
                    setPage(1);
                  }}
                  className={`rounded-full px-3 py-1 transition ${
                    statusFilter === tab.value
                      ? "bg-primary text-white"
                      : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <Card.Body className="p-0">{renderBody()}</Card.Body>
        </Card>

        {meta.pages > 1 && (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-neutral-600">
              Page {page} of {meta.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(prev + 1, meta.pages))}
              disabled={page >= meta.pages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default NotificationsPage;
