import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

const SocketContext = createContext(null);

const deriveSocketUrl = () => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }

  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    try {
      const parsed = new URL(apiUrl);
      return parsed.origin;
    } catch (error) {
      console.warn("Unable to parse VITE_API_URL for socket connection", error);
    }
  }

  return "http://localhost:4000";
};

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notificationMap, setNotificationMap] = useState({});
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setNotificationMap({});
      return;
    }

    const socketUrl = deriveSocketUrl();

    const instance = io(socketUrl, {
      auth: { token },
      withCredentials: true,
      transports: ["websocket"],
    });

    socketRef.current = instance;
    setSocket(instance);

    const handleConnect = () => {
      instance.emit("joinRoom", { userId: user._id, role: user.role });
    };

    instance.on("connect", handleConnect);

    return () => {
      instance.off("connect", handleConnect);
      instance.disconnect();
      socketRef.current = null;
      setSocket(null);
      setNotificationMap({});
    };
  }, [user, token]);

  useEffect(() => {
    const instance = socketRef.current;
    if (!instance || !user) {
      return;
    }

    const handleNotification = (payload = {}) => {
      if (!payload.roomId) {
        return;
      }

      setNotificationMap((previous) => ({
        ...previous,
        [payload.roomId]: payload.unreadCount ?? 0,
      }));
    };

    const handleMessagesRead = ({ roomId, userId }) => {
      if (!roomId || userId !== user._id) {
        return;
      }

      setNotificationMap((previous) => {
        if (previous[roomId] === undefined || previous[roomId] === 0) {
          return previous;
        }
        return {
          ...previous,
          [roomId]: 0,
        };
      });
    };

    instance.on("notification", handleNotification);
    instance.on("messagesRead", handleMessagesRead);

    return () => {
      instance.off("notification", handleNotification);
      instance.off("messagesRead", handleMessagesRead);
    };
  }, [socket, user]);

  const setInitialCounts = (rooms = []) => {
    setNotificationMap(() => {
      const next = {};
      rooms.forEach((room) => {
        const roomId =
          room?._id?.toString?.() ??
          room?.id?.toString?.() ??
          room?._id ??
          room?.id;

        if (!roomId) {
          return;
        }

        const unread =
          typeof room.unreadCount === "number" ? room.unreadCount : 0;
        next[roomId] = unread;
      });
      return next;
    });
  };

  const clearRoomNotifications = (roomId) => {
    if (!roomId) {
      return;
    }

    setNotificationMap((previous) => {
      if (!previous || previous[roomId] === undefined || previous[roomId] === 0) {
        return previous;
      }

      return {
        ...previous,
        [roomId]: 0,
      };
    });
  };

  const unreadTotal = useMemo(
    () =>
      Object.values(notificationMap).reduce(
        (sum, count) => sum + (Number.isFinite(count) ? count : 0),
        0
      ),
    [notificationMap]
  );

  const value = useMemo(
    () => ({
      socket,
      notificationMap,
      unreadTotal,
      setNotificationMap,
      setInitialCounts,
      clearRoomNotifications,
    }),
    [socket, notificationMap, unreadTotal]
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => useContext(SocketContext);

export default SocketProvider;
