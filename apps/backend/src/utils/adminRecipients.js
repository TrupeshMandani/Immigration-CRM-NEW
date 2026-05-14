const { db } = require('../db/postgres');
const { users } = require('../db/schema');
const { eq, and } = require('drizzle-orm');
const { ADMIN_NOTIFICATIONS_EMAIL } = require('../config/env');

const parseList = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const getAdminNotificationEmails = async () => {
  const recipients = new Set(parseList(ADMIN_NOTIFICATIONS_EMAIL));

  try {
    const rows = await db
      .select({ email: users.email })
      .from(users)
      .where(and(eq(users.role, 'admin'), eq(users.is_active, true)));

    rows
      .map((r) => r.email)
      .filter(Boolean)
      .forEach((email) => recipients.add(email));
  } catch (error) {
    console.error('Unable to load admin recipient list:', error);
  }

  return Array.from(recipients);
};

module.exports = { getAdminNotificationEmails };
