const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Student = require("../models/Student");
const Notification = require("../models/Notification");

let io;

const deriveOrigins = () => {
  const raw =
    process.env.SOCKET_ALLOWED_ORIGINS ||
    process.env.APP_BASE_URL ||
    process.env.CLIENT_URL ||
    "";

  if (!raw) {
    return "*";
  }

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Unauthorized"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user = null;

    if (decoded.role === "admin") {
      user = await Admin.findById(decoded.id);
    } else if (decoded.role === "student") {
      user = await Student.findById(decoded.id);
    }

    if (!user) {
      return next(new Error("Unauthorized"));
    }

    socket.data.user = {
      id: user._id.toString(),
      role: user.role || decoded.role,
      aiKey: user.aiKey,
    };
    return next();
  } catch (error) {
    console.error("Socket auth failed:", error.message);
    return next(new Error("Unauthorized"));
  }
};

const initSocket = (server) => {
  const origins = deriveOrigins();
  io = new Server(server, {
    cors: {
      origin: origins.length ? origins : "*",
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    const user = socket.data.user;
    if (user?.id) {
      socket.join(`user:${user.id}`);
    }
    if (user?.aiKey) {
      socket.join(`student:${user.aiKey}`);
    }
    if (user?.role === "admin") {
      socket.join("admins");
    }

    socket.on("joinRoom", ({ userId, role, aiKey }) => {
      if (!userId && !aiKey) return;
      if (user?.role === "admin" || (role && role === user?.role)) {
        if (userId) {
          socket.join(`user:${userId}`);
        }
        if (aiKey) {
          socket.join(`student:${aiKey}`);
        }
        if (role === "admin") {
          socket.join("admins");
        }
      }
    });

    if (user?.role === "admin") {
      (async () => {
        try {
          const unread = await Notification.find({
            recipientUserId: user.id,
            status: "UNREAD",
          })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

          socket.emit("notification:backfill", {
            notifications: unread,
            unreadCount: unread.length,
          });
        } catch (error) {
          console.error("Notification backfill failed:", error.message);
        }
      })();
    }

    socket.on("disconnect", () => {
      // placeholder for future analytics/logging
    });
  });
};

const getIo = () => {
  if (!io) {
    throw new Error("Socket server is not initialized");
  }
  return io;
};

const emitTaskEvent = (eventName, payload) => {
  try {
    const instance = getIo();
    instance.to("admins").emit(eventName, payload);
  } catch (error) {
    console.warn("Unable to emit socket event:", error.message);
  }
};

const emitTaskCreated = (task) => emitTaskEvent("task:created", task);
const emitTaskUpdated = (task) => emitTaskEvent("task:updated", task);
const emitNotification = (notification) => {
  try {
    const instance = getIo();
    const recipientId =
      notification.recipientUserId?.toString?.() ?? notification.recipientUserId;
    if (recipientId) {
      instance.to(`user:${recipientId}`).emit("notification:new", notification);
    }
  } catch (error) {
    console.warn("Unable to emit notification event:", error.message);
  }
};

module.exports = {
  initSocket,
  emitTaskCreated,
  emitTaskUpdated,
  emitNotification,
};
