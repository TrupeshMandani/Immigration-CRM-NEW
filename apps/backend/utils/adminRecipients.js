const Admin = require("../models/Admin");
const { ADMIN_NOTIFICATIONS_EMAIL } = require("../config/env");

const parseList = (value) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const getAdminNotificationEmails = async () => {
  const recipients = new Set(parseList(ADMIN_NOTIFICATIONS_EMAIL));

  try {
    const admins = await Admin.find({ isActive: true })
      .select("email")
      .lean();

    admins
      .map((admin) => admin?.email)
      .filter(Boolean)
      .forEach((email) => recipients.add(email));
  } catch (error) {
    console.error("Unable to load admin recipient list:", error);
  }

  return Array.from(recipients);
};

module.exports = {
  getAdminNotificationEmails,
};
