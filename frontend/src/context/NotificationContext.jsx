/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSocket } from "../hooks/useSocket";

const NotificationContext = createContext(null);

const AUTO_DISMISS_MS = 5000;

const NotificationToast = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="pointer-events-auto flex w-80 flex-col rounded-2xl border border-primary/20 bg-white p-4 shadow-lg shadow-primary/20">
      <p className="text-sm font-semibold text-neutral-900">
        {notification.actorName || "Student"} completed {notification.taskTitle}
      </p>
      <p className="mt-1 text-xs text-neutral-600">
        Please review the task in the admin portal.
      </p>
      {notification.taskId && (
        <a
          href={`/admin/tasks?taskId=${notification.taskId}`}
          className="mt-3 text-xs font-semibold text-primary hover:text-primary/80"
        >
          Open task →
        </a>
      )}
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-primary/10">
        <div className="h-full w-full animate-toast-progress bg-primary"></div>
      </div>
    </div>
  );
};

const ToastStack = ({ toasts, removeToast }) =>
  createPortal(
    <div className="pointer-events-none fixed right-4 top-4 z-[1200] flex w-fit flex-col gap-3">
      {toasts.map((toast) => (
        <NotificationToast
          key={toast._localId}
          notification={toast}
          onClose={() => removeToast(toast._localId)}
        />
      ))}
    </div>,
    document.body
  );

export const NotificationProvider = ({ children }) => {
  const { socket } = useSocket() || {};
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastQueue, setToastQueue] = useState([]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleBackfill = (payload = {}) => {
      setUnreadCount(payload.unreadCount || 0);
    };

    const handleNew = (payload = {}) => {
      setUnreadCount((prev) => prev + 1);
      setToastQueue((prev) => {
        const next = [
          ...prev,
          {
            ...payload,
            _localId: `${payload._id || payload.id || Date.now()}-${Math.random()}`,
          },
        ];
        return next.slice(-4);
      });
    };

    socket.on("notification:backfill", handleBackfill);
    socket.on("notification:new", handleNew);
    return () => {
      socket.off("notification:backfill", handleBackfill);
      socket.off("notification:new", handleNew);
    };
  }, [socket]);

  const removeToast = (id) => {
    setToastQueue((prev) => prev.filter((toast) => toast._localId !== id));
  };

  const value = useMemo(
    () => ({ unreadCount, setUnreadCount }),
    [unreadCount]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {toastQueue.length ? (
        <ToastStack toasts={toastQueue} removeToast={removeToast} />
      ) : null}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
