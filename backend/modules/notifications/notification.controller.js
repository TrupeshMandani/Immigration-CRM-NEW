const Notification = require("../../models/Notification");

const buildQuery = ({ userId, status }) => {
  const query = { recipientUserId: userId };
  if (status && status !== "ALL") {
    query.status = status.toUpperCase();
  }
  return query;
};

exports.listNotifications = async (req, res) => {
  try {
    const { status = "UNREAD", page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const query = buildQuery({
      userId: req.userId,
      status: status === "READ" ? "READ" : status === "ALL" ? "ALL" : "UNREAD",
    });

    const [items, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * perPage)
        .limit(perPage),
      Notification.countDocuments(query),
    ]);

    res.json({
      success: true,
      notifications: items,
      meta: {
        total,
        page: pageNum,
        limit: perPage,
        pages: Math.ceil(total / perPage) || 1,
      },
    });
  } catch (error) {
    console.error("List notifications error:", error);
    res
      .status(500)
      .json({ success: false, message: "Unable to load notifications" });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOne({
      _id: id,
      recipientUserId: req.userId,
    });
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    notification.status = "READ";
    notification.readAt = new Date();
    await notification.save();

    res.json({ success: true, notification });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ success: false, message: "Unable to update notification" });
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientUserId: req.userId, status: "UNREAD" },
      { $set: { status: "READ", readAt: new Date() } }
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Bulk mark notifications read error:", error);
    res
      .status(500)
      .json({ success: false, message: "Unable to mark notifications read" });
  }
};
