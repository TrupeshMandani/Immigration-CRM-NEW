const Task = require("../../models/Task");
const {
  formatTask,
  purgeExpiredTasks,
  markTasksRead,
} = require("./task.service");
const { emitTaskUpdated } = require("../../socket");

const sanitizeLimit = (value, fallback = 25) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 200);
};

const sanitizePage = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.max(1, Math.floor(parsed));
};

exports.listTasks = async (req, res) => {
  try {
    await purgeExpiredTasks();
    const {
      type = "all",
      status = "all",
      limit = 25,
      page = 1,
      scope,
    } = req.query;

    const normalizedType = type !== "all" ? type : undefined;
    const query = {};
    if (type !== "all") {
      query.type = type;
    }
    if (status !== "all" && scope !== "notifications") {
      query.status = status;
    }

    const perPage = sanitizeLimit(limit);
    const currentPage = sanitizePage(page);
    const skip = (currentPage - 1) * perPage;

    if (scope === "notifications") {
      const notificationQuery = {
        ...(normalizedType ? { type: normalizedType } : {}),
        status: { $in: ["pending", "failed"] },
        notificationMuted: { $ne: true },
        notificationDeleted: { $ne: true },
      };

      const tasks = await Task.find(notificationQuery)
        .sort({ createdAt: -1 })
        .limit(perPage);

      const unreadCount = await Task.countDocuments({
        ...notificationQuery,
        isRead: false,
      });

      return res.json({
        success: true,
        tasks: tasks.map(formatTask),
        meta: {
          total: tasks.length,
          unread: unreadCount,
        },
      });
    }

    const [tasks, total] = await Promise.all([
      Task.find(query).sort({ createdAt: -1 }).skip(skip).limit(perPage),
      Task.countDocuments(query),
    ]);

    res.json({
      success: true,
      tasks: tasks.map(formatTask),
      meta: {
        total,
        page: currentPage,
        limit: perPage,
        pages: Math.ceil(total / perPage) || 1,
      },
    });
  } catch (error) {
    console.error("List tasks error:", error);
    res.status(500).json({ success: false, message: "Unable to load tasks" });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const payload = req.body || {};
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (typeof payload.description === "string") {
      task.description = payload.description.trim();
    }

    if (typeof payload.priority === "string") {
      task.priority = payload.priority;
    }

    if (typeof payload.isRead === "boolean") {
      task.isRead = payload.isRead;
    }

    if (typeof payload.notificationMuted === "boolean") {
      task.notificationMuted = payload.notificationMuted;
    }

    if (typeof payload.notificationDeleted === "boolean") {
      task.notificationDeleted = payload.notificationDeleted;
    }

    const allowedStatuses = ["pending", "verified", "failed", "completed"];
    if (payload.status && allowedStatuses.includes(payload.status)) {
      task.status = payload.status;
      if (["verified", "failed", "completed"].includes(payload.status)) {
        task.verificationStatus =
          payload.status === "completed" ? task.verificationStatus : payload.status;
        task.resolvedAt = new Date();
      }
    }

    await task.save();
    const formatted = formatTask(task);
    emitTaskUpdated(formatted);

    res.json({ success: true, task: formatted });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ success: false, message: "Unable to update task" });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    await task.deleteOne();
    res.json({ success: true });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ success: false, message: "Unable to delete task" });
  }
};

exports.markNotificationsRead = async (req, res) => {
  try {
    const { taskIds } = req.body || {};
    const result = await markTasksRead(taskIds);
    res.json({ success: true, updated: result.updated });
  } catch (error) {
    console.error("Mark notifications read error:", error);
    res
      .status(500)
      .json({ success: false, message: "Unable to update notifications" });
  }
};
