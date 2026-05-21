import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { db } from '../../db/postgres';
import { users, applicants } from '../../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { generateAiKey } from '../../utils/generateAiKey';
import { getAdminNotificationEmails } from '../../utils/adminRecipients';
import { sendEmail } from '../../utils/sendEmail';
import { getFirebaseAdmin } from '../../utils/firebaseAdmin';
import { sendApplicantInviteEmail } from '../applicants/applicant.invite';
import env from '../../config/env';

interface LoginBody { username: string; password: string; }
interface FirebaseLoginBody { idToken: string; }
interface SendLoginLinkBody { email: string; }
interface ChangePasswordBody { currentPassword: string; newPassword: string; }
interface RegisterApplicantBody { name: string; email: string; phone?: string; }
interface RegisterAdminBody { username: string; email: string; password: string; }

const getAppBaseUrl = () =>
  ((env as { APP_BASE_URL?: string })?.APP_BASE_URL || process.env.APP_BASE_URL || 'https://portal.example.com').replace(/\/$/, '');

const ACCESS_SECRET  = () => process.env.JWT_ACCESS_SECRET  ?? process.env.JWT_SECRET ?? '';
const REFRESH_SECRET = () => process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? '';
const DEFAULT_FIRM_ID = () => process.env.DEFAULT_FIRM_ID ?? '';

interface UserLike { id: string; role: string; ai_key?: string | null; }

const generateToken = (user: UserLike, firmId: string) =>
  jwt.sign(
    { id: user.id, user_id: user.id, firm_id: firmId, role: user.role, aiKey: user.ai_key ?? undefined },
    ACCESS_SECRET(),
    { expiresIn: '15m' },
  );

const generateRefreshToken = (user: UserLike, firmId: string) =>
  jwt.sign(
    { id: user.id, user_id: user.id, firm_id: firmId, role: user.role },
    REFRESH_SECRET(),
    { expiresIn: '7d' },
  );

const setRefreshCookie = (res: Response, refreshToken: string) =>
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth/refresh',
  });

// ─── login ────────────────────────────────────────────────────────────────────
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body as LoginBody;
    if (!username || !password) {
      res.status(400).json({ message: 'Username and password required' });
      return;
    }

    const email = username.trim().toLowerCase();
    const firmId = DEFAULT_FIRM_ID();

    const [admin] = await db.select().from(users)
      .where(and(eq(users.email, email), eq(users.firm_id, firmId)))
      .limit(1);

    if (admin) {
      const valid = await bcrypt.compare(password, admin.password_hash ?? '');
      if (!valid) { res.status(401).json({ message: 'Invalid credentials' }); return; }

      const token = generateToken({ ...admin, role: admin.role ?? 'admin' }, firmId);
      setRefreshCookie(res, generateRefreshToken({ ...admin, role: admin.role ?? 'admin' }, firmId));
      res.json({
        message: 'Login successful',
        token,
        user: { id: admin.id, username: admin.email, email: admin.email, role: admin.role },
      });
      return;
    }

    const [student] = await db.select({ id: applicants.id }).from(applicants)
      .where(and(eq(applicants.email, email), inArray(applicants.status, ['active', 'registered'])))
      .limit(1);

    if (student) {
      res.status(403).json({
        message: 'Applicants must sign in using the email link or Google option on the login page.',
      });
      return;
    }

    res.status(401).json({ message: 'Invalid credentials' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
}

// ─── firebaseLogin ────────────────────────────────────────────────────────────
export async function firebaseLogin(req: Request, res: Response): Promise<void> {
  try {
    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
      res.status(500).json({ message: 'Firebase authentication is not configured.' });
      return;
    }

    const { idToken } = (req.body ?? {}) as FirebaseLoginBody;
    if (!idToken) { res.status(400).json({ message: 'Firebase idToken is required.' }); return; }

    const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    const email = decoded.email?.toLowerCase();
    if (!email) { res.status(400).json({ message: 'Firebase user is missing an email address.' }); return; }

    if (decoded.email_verified === false) {
      res.status(403).json({ message: 'Please verify your email with the provider before signing in.' });
      return;
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
      res.status(403).json({ message: 'Admin accounts must sign in with email and password.' });
      return;
    }

    let [student] = await db.select().from(applicants)
      .where(and(eq(applicants.email, email), eq(applicants.firm_id, firmId)))
      .limit(1);

    if (!student) {
      let aiKey = generateAiKey(displayName || email);
      const existing = await db.select({ ai_key: applicants.ai_key }).from(applicants)
        .where(eq(applicants.ai_key, aiKey)).limit(1);
      if (existing.length) aiKey = `${aiKey}_${Date.now().toString(36)}`;

      const [created] = await db.insert(applicants).values({
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
        res.status(403).json({ message: 'Your account is inactive. Please contact support.' });
        return;
      }
    }

    const studentUser = { ...student, role: 'applicant' };
    const token = generateToken(studentUser, firmId);
    setRefreshCookie(res, generateRefreshToken(studentUser, firmId));

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: student.id,
        username: student.email,
        email: student.email,
        role: 'applicant',
        aiKey: student.ai_key,
        status: student.status,
      },
    });
  } catch (error) {
    console.error('Firebase login error:', error);
    if ((error as { code?: string }).code === 'auth/invalid-id-token') {
      res.status(401).json({ message: 'Invalid Firebase token.' });
      return;
    }
    res.status(500).json({ message: 'Firebase login failed.' });
  }
}

// ─── sendLoginLink ────────────────────────────────────────────────────────────
export async function sendLoginLink(req: Request, res: Response): Promise<void> {
  try {
    const emailRaw = (req.body as SendLoginLinkBody)?.email;
    if (!emailRaw || typeof emailRaw !== 'string') {
      res.status(400).json({ message: 'Email address is required.' });
      return;
    }
    const email = emailRaw.trim().toLowerCase();
    const firmId = DEFAULT_FIRM_ID();

    const [student] = await db.select().from(applicants)
      .where(and(eq(applicants.email, email), eq(applicants.firm_id, firmId)))
      .limit(1);

    if (!student) {
      res.status(404).json({
        message: "We couldn't find a student account with that email. Please contact your advisor.",
      });
      return;
    }
    if (student.status === 'closed') {
      res.status(403).json({ message: 'This account is inactive. Contact your advisor.' });
      return;
    }

    const name = student.first_name
      ? `${student.first_name} ${student.last_name || ''}`.trim()
      : email.split('@')[0];

    const invite = await sendApplicantInviteEmail({ email, name });
    res.json({
      message: invite.emailSent
        ? 'Check your inbox for a secure login link.'
        : 'Login link generated but email delivery failed. Ask your advisor to resend.',
      inviteSent: invite.emailSent,
      loginLink: invite.loginLink,
    });
  } catch (error) {
    console.error('Send login link error:', error);
    res.status(500).json({ message: 'Unable to send the login link right now.' });
  }
}

// ─── changePassword ───────────────────────────────────────────────────────────
export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body as ChangePasswordBody;
    const user = req.user as { role: string; id: string; password_hash?: string };

    if (user.role === 'applicant') {
      res.status(403).json({
        message: 'Applicant accounts use passwordless authentication. Request a sign-in link instead.',
      });
      return;
    }
    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Current and new password required' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters' });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash ?? '');
    if (!valid) { res.status(401).json({ message: 'Current password is incorrect' }); return; }

    const hash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ password_hash: hash }).where(eq(users.id, user.id));

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
}

// ─── registerStudent ──────────────────────────────────────────────────────────
export async function registerStudent(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, phone } = (req.body ?? {}) as RegisterApplicantBody;
    if (!name || !email) { res.status(400).json({ message: 'Name and email are required.' }); return; }

    const normalizedEmail = email.trim().toLowerCase();
    const firmId = DEFAULT_FIRM_ID();

    const [existingStudent] = await db.select({ id: applicants.id }).from(applicants)
      .where(and(eq(applicants.email, normalizedEmail), eq(applicants.firm_id, firmId))).limit(1);
    if (existingStudent) {
      res.status(400).json({ message: 'An account with this email already exists.' });
      return;
    }

    const [existingAdmin] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.email, normalizedEmail), eq(users.firm_id, firmId))).limit(1);
    if (existingAdmin) {
      res.status(400).json({ message: 'An administrator already uses this email.' });
      return;
    }

    let aiKey = generateAiKey(name);
    const collision = await db.select({ ai_key: applicants.ai_key }).from(applicants)
      .where(eq(applicants.ai_key, aiKey)).limit(1);
    if (collision.length) aiKey = `${aiKey}_${Date.now().toString(36)}`;

    const nameParts = name.trim().split(' ');
    const [inserted] = await db.insert(applicants).values({
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

    const invite = await sendApplicantInviteEmail({ email: normalizedEmail, name });
    res.status(201).json({
      message: invite.emailSent
        ? 'Registration successful. Check your email for the login link.'
        : 'Registration received but email delivery failed.',
      inviteSent: invite.emailSent,
      loginLink: invite.loginLink,
    });
  } catch (error) {
    console.error('Applicant registration error:', error);
    if ((error as { code?: string }).code === '23505') {
      res.status(400).json({ message: 'Email already in use.' });
      return;
    }
    res.status(500).json({ message: 'Failed to register student.' });
  }
}

// ─── registerAdmin ────────────────────────────────────────────────────────────
export async function registerAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { username, email, password } = req.body as RegisterAdminBody;
    if (!username || !email || !password) {
      res.status(400).json({ message: 'All fields required' });
      return;
    }

    const firmId = DEFAULT_FIRM_ID();
    const existingAdmins = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.role, 'admin'), eq(users.firm_id, firmId))).limit(1);
    if (existingAdmins.length) {
      res.status(400).json({ message: 'Admin already exists' });
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const [admin] = await db.insert(users).values({
      firm_id: firmId,
      email: email.trim().toLowerCase(),
      password_hash: hash,
      role: 'admin',
      first_name: username,
    }).returning();

    const token = generateToken({ ...admin, role: admin.role ?? 'admin' }, firmId);
    setRefreshCookie(res, generateRefreshToken({ ...admin, role: admin.role ?? 'admin' }, firmId));
    res.status(201).json({
      message: 'Admin created successfully',
      token,
      user: { id: admin.id, username: admin.email, email: admin.email, role: admin.role },
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    if ((error as { code?: string }).code === '23505') {
      res.status(400).json({ message: 'Email already exists' });
      return;
    }
    res.status(500).json({ message: 'Failed to create admin' });
  }
}

// ─── refresh ──────────────────────────────────────────────────────────────────
export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) { res.status(401).json({ message: 'Refresh token required' }); return; }

    let decoded: jwt.JwtPayload;
    try {
      decoded = jwt.verify(token, REFRESH_SECRET()) as jwt.JwtPayload;
    } catch {
      res.status(401).json({ message: 'Invalid or expired refresh token' });
      return;
    }

    const firmId = (decoded.firm_id as string | undefined) ?? DEFAULT_FIRM_ID();
    let user: UserLike | null = null;

    if (decoded.role === 'applicant') {
      const [row] = await db.select().from(applicants)
        .where(eq(applicants.id, decoded.id as string)).limit(1);
      if (row) user = { ...row, role: 'applicant' };
    } else {
      const [row] = await db.select().from(users)
        .where(eq(users.id, decoded.id as string)).limit(1);
      user = row ? { ...row, role: row.role ?? 'admin' } : null;
    }

    if (!user) { res.status(403).json({ message: 'User no longer exists' }); return; }

    const newAccessToken = generateToken(user, firmId);
    setRefreshCookie(res, generateRefreshToken(user, firmId));
    res.json({ token: newAccessToken });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ message: 'Token refresh failed' });
  }
}

// ─── getProfile ───────────────────────────────────────────────────────────────
export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as {
      id: string;
      email: string;
      role: string;
      ai_key?: string | null;
      aiKey?: string;
      profile_data?: unknown;
      profile?: unknown;
      status?: string;
      is_active?: boolean;
      preferences?: unknown;
      state_data?: { preferences?: unknown };
    };
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
}
