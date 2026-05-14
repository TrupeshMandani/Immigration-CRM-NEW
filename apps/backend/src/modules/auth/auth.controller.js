const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { db } = require('../../db/postgres');
const { users, students } = require('../../db/schema');
const { eq, and, inArray } = require('drizzle-orm');
const { generateAiKey } = require('../../utils/generateAiKey');
const { getAdminNotificationEmails } = require('../../utils/adminRecipients');
const { sendEmail } = require('../../utils/sendEmail');
const { getFirebaseAdmin } = require('../../utils/firebaseAdmin');
const { sendStudentInviteEmail } = require('../students/student.invite');
const env = require('../../config/env');

const getAppBaseUrl = () =>
  (env?.APP_BASE_URL || process.env.APP_BASE_URL || 'https://portal.example.com').replace(/\/$/, '');

const ACCESS_SECRET  = () => process.env.JWT_ACCESS_SECRET  ?? process.env.JWT_SECRET;
const REFRESH_SECRET = () => process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET;
const DEFAULT_FIRM_ID = () => process.env.DEFAULT_FIRM_ID ?? '';

const generateToken = (user, firmId) =>
  jwt.sign(
    { id: user.id, user_id: user.id, firm_id: firmId ?? DEFAULT_FIRM_ID(), role: user.role, aiKey: user.ai_key ?? undefined },
    ACCESS_SECRET(),
    { expiresIn: '15m' },
  );

const generateRefreshToken = (user, firmId) =>
  jwt.sign(
    { id: user.id, user_id: user.id, firm_id: firmId ?? DEFAULT_FIRM_ID(), role: user.role },
    REFRESH_SECRET(),
    { expiresIn: '7d' },
  );

const setRefreshCookie = (res, refreshToken) =>
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth/refresh',
  });

// ─── login ────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const email = username.trim().toLowerCase();
    const firmId = DEFAULT_FIRM_ID();

    const [admin] = await db.select().from(users)
      .where(and(eq(users.email, email), eq(users.firm_id, firmId)))
      .limit(1);

    if (admin) {
      const valid = await bcrypt.compare(password, admin.password_hash);
      if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

      const token = generateToken(admin, firmId);
      setRefreshCookie(res, generateRefreshToken(admin, firmId));
      return res.json({
        message: 'Login successful',
        token,
        user: { id: admin.id, username: admin.email, email: admin.email, role: admin.role },
      });
    }

    const [student] = await db.select({ id: students.id }).from(students)
      .where(and(eq(students.email, email), inArray(students.status, ['active', 'registered'])))
      .limit(1);

    if (student) {
      return res.status(403).json({
        message: 'Students must sign in using the email link or Google option on the login page.',
      });
    }

    return res.status(401).json({ message: 'Invalid credentials' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};

// ─── firebaseLogin ────────────────────────────────────────────────────────────
exports.firebaseLogin = async (req, res) => {
  try {
    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
      return res.status(500).json({ message: 'Firebase authentication is not configured.' });
    }

    const { idToken } = req.body || {};
    if (!idToken) return res.status(400).json({ message: 'Firebase idToken is required.' });

    const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    const email = decoded.email?.toLowerCase();
    if (!email) return res.status(400).json({ message: 'Firebase user is missing an email address.' });

    if (decoded.email_verified === false) {
      return res.status(403).json({ message: 'Please verify your email with the provider before signing in.' });
    }

    const displayName =
      decoded.name ||
      `${decoded.given_name || ''} ${decoded.family_name || ''}`.trim() ||
      email.split('@')[0];

    const firmId = DEFAULT_FIRM_ID();

    const [existingAdmin] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.email, email), eq(users.firm_id, firmId)))
      .limit(1);
    if (existingAdmin) {
      return res.status(403).json({ message: 'Admin accounts must sign in with email and password.' });
    }

    let [student] = await db.select().from(students)
      .where(and(eq(students.email, email), eq(students.firm_id, firmId)))
      .limit(1);

    if (!student) {
      let aiKey = generateAiKey(displayName || email);
      const existing = await db.select({ ai_key: students.ai_key }).from(students)
        .where(eq(students.ai_key, aiKey)).limit(1);
      if (existing.length) aiKey = `${aiKey}_${Date.now().toString(36)}`;

      const [created] = await db.insert(students).values({
        firm_id: firmId,
        email,
        ai_key: aiKey,
        status: 'registered',
        first_name: displayName.split(' ')[0] || displayName,
        last_name: displayName.split(' ').slice(1).join(' ') || null,
        profile_data: { fullName: displayName, email },
      }).returning();
      student = created;
    } else {
      if (student.status === 'closed') {
        return res.status(403).json({ message: 'Your account is inactive. Please contact support.' });
      }
    }

    const token = generateToken({ ...student, role: 'student' }, firmId);
    setRefreshCookie(res, generateRefreshToken({ ...student, role: 'student' }, firmId));

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: student.id,
        username: student.email,
        email: student.email,
        role: 'student',
        aiKey: student.ai_key,
        status: student.status,
      },
    });
  } catch (error) {
    console.error('Firebase login error:', error);
    if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ message: 'Invalid Firebase token.' });
    }
    res.status(500).json({ message: 'Firebase login failed.' });
  }
};

// ─── sendLoginLink ────────────────────────────────────────────────────────────
exports.sendLoginLink = async (req, res) => {
  try {
    const emailRaw = req.body?.email;
    if (!emailRaw || typeof emailRaw !== 'string') {
      return res.status(400).json({ message: 'Email address is required.' });
    }
    const email = emailRaw.trim().toLowerCase();
    const firmId = DEFAULT_FIRM_ID();

    const [student] = await db.select().from(students)
      .where(and(eq(students.email, email), eq(students.firm_id, firmId)))
      .limit(1);

    if (!student) {
      return res.status(404).json({
        message: "We couldn't find a student account with that email. Please contact your advisor.",
      });
    }
    if (student.status === 'closed') {
      return res.status(403).json({ message: 'This account is inactive. Contact your advisor.' });
    }

    const name = student.first_name
      ? `${student.first_name} ${student.last_name || ''}`.trim()
      : email.split('@')[0];

    const invite = await sendStudentInviteEmail({ email, name });
    return res.json({
      message: invite.emailSent
        ? 'Check your inbox for a secure login link.'
        : 'Login link generated but email delivery failed. Ask your advisor to resend.',
      inviteSent: invite.emailSent,
      loginLink: invite.loginLink,
    });
  } catch (error) {
    console.error('Send login link error:', error);
    return res.status(500).json({ message: 'Unable to send the login link right now.' });
  }
};

// ─── changePassword ───────────────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    if (user.role === 'student') {
      return res.status(403).json({
        message: 'Student accounts use passwordless authentication. Request a sign-in link instead.',
      });
    }
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ password_hash: hash }).where(eq(users.id, user.id));

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
};

// ─── registerStudent ──────────────────────────────────────────────────────────
exports.registerStudent = async (req, res) => {
  try {
    const { name, email, phone } = req.body || {};
    if (!name || !email) return res.status(400).json({ message: 'Name and email are required.' });

    const normalizedEmail = email.trim().toLowerCase();
    const firmId = DEFAULT_FIRM_ID();

    const [existingStudent] = await db.select({ id: students.id }).from(students)
      .where(and(eq(students.email, normalizedEmail), eq(students.firm_id, firmId))).limit(1);
    if (existingStudent) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const [existingAdmin] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.email, normalizedEmail), eq(users.firm_id, firmId))).limit(1);
    if (existingAdmin) {
      return res.status(400).json({ message: 'An administrator already uses this email.' });
    }

    let aiKey = generateAiKey(name);
    const collision = await db.select({ ai_key: students.ai_key }).from(students)
      .where(eq(students.ai_key, aiKey)).limit(1);
    if (collision.length) aiKey = `${aiKey}_${Date.now().toString(36)}`;

    const nameParts = name.trim().split(' ');
    const [inserted] = await db.insert(students).values({
      firm_id: firmId,
      email: normalizedEmail,
      ai_key: aiKey,
      status: 'registered',
      first_name: nameParts[0] || name,
      last_name: nameParts.slice(1).join(' ') || null,
      profile_data: { fullName: name, email: normalizedEmail, phone: phone?.trim() || '' },
    }).returning();

    try {
      const adminRecipients = await getAdminNotificationEmails();
      if (adminRecipients.length) {
        const profileUrl = `${getAppBaseUrl()}/admin/students/${inserted.id}`;
        await sendEmail({
          to: adminRecipients.join(', '),
          subject: 'New student registration received',
          html: `<p>New student <strong>${name}</strong> (${normalizedEmail}) registered. <a href="${profileUrl}">Review profile</a></p>`,
        });
      }
    } catch (notifyError) {
      console.error('Failed to send registration notification:', notifyError);
    }

    const invite = await sendStudentInviteEmail({ email: normalizedEmail, name });
    res.status(201).json({
      message: invite.emailSent
        ? 'Registration successful. Check your email for the login link.'
        : 'Registration received but email delivery failed.',
      inviteSent: invite.emailSent,
      loginLink: invite.loginLink,
    });
  } catch (error) {
    console.error('Student registration error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Email already in use.' });
    }
    res.status(500).json({ message: 'Failed to register student.' });
  }
};

// ─── registerAdmin ────────────────────────────────────────────────────────────
exports.registerAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields required' });
    }

    const firmId = DEFAULT_FIRM_ID();
    const existingAdmins = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.role, 'admin'), eq(users.firm_id, firmId))).limit(1);
    if (existingAdmins.length) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [admin] = await db.insert(users).values({
      firm_id: firmId,
      email: email.trim().toLowerCase(),
      password_hash: hash,
      role: 'admin',
      first_name: username,
    }).returning();

    const token = generateToken(admin, firmId);
    setRefreshCookie(res, generateRefreshToken(admin, firmId));
    res.status(201).json({
      message: 'Admin created successfully',
      token,
      user: { id: admin.id, username: admin.email, email: admin.email, role: admin.role },
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Failed to create admin' });
  }
};

// ─── refresh ──────────────────────────────────────────────────────────────────
exports.refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ message: 'Refresh token required' });

    let decoded;
    try {
      decoded = jwt.verify(token, REFRESH_SECRET());
    } catch {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const firmId = decoded.firm_id ?? DEFAULT_FIRM_ID();
    let user = null;

    if (decoded.role === 'student') {
      const [row] = await db.select().from(students)
        .where(eq(students.id, decoded.id)).limit(1);
      if (row) user = { ...row, role: 'student' };
    } else {
      const [row] = await db.select().from(users)
        .where(eq(users.id, decoded.id)).limit(1);
      user = row ?? null;
    }

    if (!user) return res.status(403).json({ message: 'User no longer exists' });

    const newAccessToken = generateToken(user, firmId);
    setRefreshCookie(res, generateRefreshToken(user, firmId));
    res.json({ token: newAccessToken });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ message: 'Token refresh failed' });
  }
};

// ─── getProfile ───────────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const user = req.user;
    res.json({
      id: user.id,
      username: user.email,
      email: user.email,
      role: user.role,
      aiKey: user.ai_key ?? user.aiKey ?? undefined,
      profile: user.profile_data ?? user.profile ?? undefined,
      status: user.status ?? (user.is_active ? 'active' : 'closed'),
      preferences: user.preferences ?? (user.state_data ?? {}).preferences ?? {},
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to get profile' });
  }
};
