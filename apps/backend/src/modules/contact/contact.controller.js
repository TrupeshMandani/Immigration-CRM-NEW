const { db } = require('../../db/postgres');
const { students } = require('../../db/schema');
const { eq, and, ne } = require('drizzle-orm');
const { sendEmail } = require('../../utils/sendEmail');
const { APP_BASE_URL } = require('../../config/env');
const { generateAiKey } = require('../../utils/generateAiKey');
const { getAdminNotificationEmails } = require('../../utils/adminRecipients');

const DEFAULT_FIRM_ID = () => process.env.DEFAULT_FIRM_ID ?? '';

exports.submitContact = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'Name and email are required' });

    const normalizedEmail = email.trim().toLowerCase();
    const firmId = DEFAULT_FIRM_ID();

    const [existingPending] = await db.select({ id: students.id }).from(students)
      .where(and(eq(students.email, normalizedEmail), eq(students.status, 'pending'), eq(students.firm_id, firmId)))
      .limit(1);
    if (existingPending) {
      return res.status(400).json({ message: 'Contact request already submitted' });
    }

    const [existingActive] = await db.select({ id: students.id }).from(students)
      .where(and(eq(students.email, normalizedEmail), ne(students.status, 'closed'), eq(students.firm_id, firmId)))
      .limit(1);
    if (existingActive) {
      return res.status(400).json({ message: 'An account with this email already exists. Please use the login option.' });
    }

    const nameParts = name.trim().split(' ');
    let aiKey = generateAiKey(nameParts[0] || name);
    const collision = await db.select({ ai_key: students.ai_key }).from(students)
      .where(eq(students.ai_key, aiKey)).limit(1);
    if (collision.length) aiKey = `${aiKey}_${Math.random().toString(36).substr(2, 4)}`;

    const [inserted] = await db.insert(students).values({
      firm_id: firmId,
      email: normalizedEmail,
      ai_key: aiKey,
      status: 'pending',
      first_name: nameParts[0] || name,
      last_name: nameParts.slice(1).join(' ') || null,
      profile_data: { name, email: normalizedEmail, phone: phone ?? '', message: message ?? '' },
    }).returning();

    const adminRecipients = await getAdminNotificationEmails();
    if (adminRecipients.length) {
      try {
        const portalLink = `${(APP_BASE_URL || '').replace(/\/$/, '')}/admin/requests`;
        await sendEmail({
          to: adminRecipients.join(', '),
          subject: 'New Immigration CRM contact request',
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
              <h2 style="color:#1d4ed8;margin-bottom:12px;">New contact submitted</h2>
              <p>New contact from <strong>${name}</strong> (${normalizedEmail}).</p>
              <a href="${portalLink}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;">Open Contact Requests</a>
            </div>
          `,
        });
      } catch (notifyError) {
        console.error('Failed to send admin contact notification:', notifyError);
      }
    }

    res.status(201).json({ message: 'Contact request submitted successfully', contactId: inserted.id });
  } catch (error) {
    console.error('Contact submission error:', error);
    res.status(500).json({ message: 'Failed to submit contact request' });
  }
};
