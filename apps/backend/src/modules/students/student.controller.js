const path = require('path');
const {
  getPresignedUrl,
  deleteS3Object,
  listStudentFiles,
  getMimeType,
  uploadFileToS3,
  deleteLocalFile,
} = require('../s3/s3.service');
const { sendEmail } = require('../../utils/sendEmail');
const env = require('../../config/env');
const { getAdminNotificationEmails } = require('../../utils/adminRecipients');
const { generateAiKey } = require('../../utils/generateAiKey');
const { sendStudentInviteEmail } = require('./student.invite');
const { extractProfileWithAI } = require('../ai/extract.service');
const { prioritizeFields } = require('../../AI/ai-file-extract/field-priority');
const { upsertStudent, mergePassportDetails, normalizePassportDate } = require('./student.service');
const {
  buildRequiredDocFileName,
  guessExtension,
} = require('../../utils/fileName');
const { verifyDocumentType } = require('../ai/verification.service');
const { createAIVerificationTask } = require('../tasks/tasks.service');
const { send: sendNotification } = require('../notifications/notifications.service');

const { db } = require('../../db/postgres');
const { students, documents, users, tasks } = require('../../db/schema');
const { eq, and, or, ilike, inArray, isNull, ne, desc } = require('drizzle-orm');

const DEFAULT_FIRM_ID = () => process.env.DEFAULT_FIRM_ID ?? '';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getAppBaseUrl = () =>
  (env?.APP_BASE_URL || process.env.APP_BASE_URL || 'https://portal.example.com').replace(/\/$/, '');

const canManageStudentDocuments = (user, student) => {
  if (!user || !student) return false;
  if (['admin', 'senior', 'junior'].includes(user.role)) return true;
  if (user.role === 'student' && (user.ai_key || user.aiKey) === student.ai_key) return true;
  return false;
};

const getStudentEmail = (student) => student?.email ?? null;

const getStudentName = (student) =>
  student.first_name
    ? `${student.first_name} ${student.last_name || ''}`.trim()
    : (student.profile_data?.fullName || student.profile_data?.name || student.email || 'Student');

const sendTaskAssignedEmail = async ({ student, task }) => {
  const recipient = getStudentEmail(student);
  if (!recipient) return;
  try {
    await sendEmail({
      to: recipient,
      subject: `New task assigned: ${task.title}`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; color: #0f172a; line-height: 1.6;">
          <h2 style="margin-bottom: 12px; color: #1d4ed8;">New task assigned</h2>
          <p>You have been assigned a new task: <strong>${task.title}</strong>.</p>
          ${task.description ? `<p>${task.description}</p>` : ''}
          ${task.due_at ? `<p>Due date: <strong>${new Date(task.due_at).toLocaleDateString()}</strong></p>` : ''}
          <p>Please log into your portal to review the full details.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send task email:', error.message);
  }
};

// ─── Required-doc helpers (state_data.doc_defs) ───────────────────────────────

const createDocumentSlug = (name = '') => {
  const base = name.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'document';
  const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return `${base}-${unique}`;
};

const getDocDefs = (student) => (student.state_data?.doc_defs ?? {});

const saveDocDefs = async (studentId, defs, student) => {
  const newStateData = { ...(student.state_data ?? {}), doc_defs: defs };
  const [updated] = await db.update(students)
    .set({ state_data: newStateData, updated_at: new Date() })
    .where(eq(students.id, studentId))
    .returning();
  return updated;
};

const DEFAULT_REQUIRED_DOCUMENTS = [
  { name: 'Passport', description: 'Upload a clear scan of the bio-data page from your passport.' },
  { name: 'Language Test Result (IELTS)', description: 'Provide the most recent IELTS test report showing all band scores.' },
  { name: 'Photograph', description: 'Attach a recent passport-sized photograph that meets visa requirements.' },
  { name: 'Proof of Funds', description: 'Submit bank statements or financial documents demonstrating sufficient funds.' },
  { name: 'Acceptance Letter', description: 'Upload the official acceptance letter from your educational institution.' },
  { name: 'Medical Examination Report', description: 'Provide the medical examination report from an approved panel physician.' },
  { name: 'Police Clearance Certificate', description: 'Attach a police clearance certificate from your country of residence.' },
  { name: 'Previous Visa Copies', description: 'Upload copies of any previous visas you have held.' },
  { name: 'Educational Transcripts', description: 'Provide transcripts from your previous educational institutions.' },
];

const sanitizeForSlug = (value = '') =>
  value.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'document';

const ensureDefaultDocDefs = (defs) => {
  const existingKeys = new Set(Object.values(defs).map((d) => sanitizeForSlug(d.name || '')));
  let changed = false;
  for (const { name, description } of DEFAULT_REQUIRED_DOCUMENTS) {
    if (!existingKeys.has(sanitizeForSlug(name))) {
      const slug = createDocumentSlug(name);
      defs[slug] = { name, description, slug, aiExtractionEnabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      existingKeys.add(sanitizeForSlug(name));
      changed = true;
    }
  }
  return changed;
};

// Build formatted doc response from def + files rows
const VERIFICATION_STATUSES = new Set(['pending', 'verified', 'failed']);

const normalizeFileVerification = (ai_verification = {}) => {
  const rawStatus = typeof ai_verification.status === 'string' ? ai_verification.status.toLowerCase() : '';
  return {
    status: VERIFICATION_STATUSES.has(rawStatus) ? rawStatus : 'pending',
    confidence: typeof ai_verification.confidence === 'number' ? ai_verification.confidence : null,
    detectedType: ai_verification.detectedType || '',
    reason: ai_verification.reason || '',
    checkedAt: ai_verification.checkedAt || ai_verification.lastCheckedAt || null,
  };
};

const mapDocRowForResponse = (row) => ({
  id: row.id,
  name: row.ai_verification?.name || path.basename(row.s3_key || ''),
  bucket: row.s3_bucket,
  size: row.size_bytes,
  mimeType: row.mime_type,
  uploadedAt: row.created_at,
  uploadedBy: row.uploaded_by,
  uploadedByRole: row.ai_verification?.uploadedByRole || null,
  key: row.s3_key,
  verificationTaskId: row.ai_verification?.verificationTaskId || null,
  verification: normalizeFileVerification(row.ai_verification ?? {}),
});

const buildVerificationSummary = (defData, fileRows) => {
  const files = fileRows.map(mapDocRowForResponse);
  const summary = {
    status: defData.verification?.status || 'pending',
    confidence: null,
    detectedType: '',
    reason: files.length ? 'Awaiting AI confirmation.' : 'No files uploaded yet.',
    lastCheckedAt: defData.verification?.lastCheckedAt || null,
  };

  if (!files.length) { summary.status = 'pending'; return { summary, files }; }

  const statuses = files.map((f) => f.verification.status);
  if (statuses.includes('verified')) summary.status = 'verified';
  else if (statuses.includes('failed')) summary.status = 'failed';
  else summary.status = statuses[statuses.length - 1] || 'pending';

  const sorted = [...files].sort((a, b) =>
    new Date(b.verification.checkedAt || b.uploadedAt || 0) - new Date(a.verification.checkedAt || a.uploadedAt || 0)
  );
  const latest = sorted[0];
  summary.lastCheckedAt = latest?.verification?.checkedAt || null;
  summary.confidence = latest?.verification?.confidence ?? null;
  summary.detectedType = latest?.verification?.detectedType || '';
  summary.reason = latest?.verification?.reason || (summary.status === 'verified' ? 'AI verified the latest upload.' : 'Manual verification required.');

  return { summary, files };
};

const formatRequiredDoc = (slug, defData, fileRows) => {
  const { summary, files } = buildVerificationSummary(defData, fileRows);
  return {
    id: slug,
    name: defData.name,
    description: defData.description || '',
    slug,
    aiExtractionEnabled: Boolean(defData.aiExtractionEnabled),
    createdAt: defData.createdAt,
    updatedAt: defData.updatedAt,
    isUploaded: files.length > 0,
    filesCount: files.length,
    verification: summary,
    verificationStatus: summary.status,
    files,
  };
};

const getDocFilesMap = async (studentId, slugs) => {
  if (!slugs.length) return {};
  const rows = await db.select().from(documents)
    .where(and(eq(documents.student_id, studentId), inArray(documents.document_type, slugs)));
  const map = {};
  for (const row of rows) {
    if (!map[row.document_type]) map[row.document_type] = [];
    map[row.document_type].push(row);
  }
  return map;
};

const notifyStudentAboutRequiredDoc = async (student, docName) => {
  try {
    const recipient = getStudentEmail(student);
    if (!recipient) return;
    await sendEmail({
      to: recipient,
      subject: `New required document: ${docName}`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; color: #0f172a; line-height: 1.6;">
          <h2 style="margin-bottom: 12px; color: #1d4ed8;">New document requested</h2>
          <p>Your advisor just requested <strong>${docName}</strong>.</p>
          <p>Please sign in to the client portal to upload the file securely.</p>
          <a href="${env.APP_BASE_URL}/login" style="display: inline-block; padding: 12px 20px; background: #2563eb; color: #ffffff; border-radius: 8px; font-weight: 600; text-decoration: none;">Open portal</a>
        </div>
      `,
    });
  } catch (err) {
    console.error('Failed to send required document notification:', err);
  }
};

// ─── Task helpers ─────────────────────────────────────────────────────────────

// Map Postgres task row to legacy student-task response shape
const formatStudentTask = (row) => {
  if (!row) return null;
  const meta = row.metadata ?? {};
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    dueDate: row.due_at,
    status: row.status === 'done' ? 'completed' : row.status === 'open' ? 'pending' : row.status,
    assignedBy: row.created_by,
    assignedAt: row.created_at,
    completedAt: row.completed_at,
    seenByStudent: row.is_read,
    attachment: meta.attachment ?? null,
  };
};

// ─── Student list/CRUD ────────────────────────────────────────────────────────

exports.getAllStudents = async (req, res) => {
  try {
    const { status, search } = req.query;
    const firmId = req.context?.firmId || DEFAULT_FIRM_ID();

    let conditions = [eq(students.firm_id, firmId)];
    if (status) conditions.push(eq(students.status, status));

    let list;
    if (search) {
      const term = `%${search}%`;
      list = await db.select().from(students)
        .where(and(...conditions, or(
          ilike(students.first_name, term),
          ilike(students.last_name, term),
          ilike(students.email, term),
        )));
    } else {
      list = await db.select().from(students).where(and(...conditions));
    }

    res.json(list);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Failed to get students' });
  }
};

exports.getRegisteredStudents = async (req, res) => {
  try {
    const { search } = req.query;
    const firmId = req.context?.firmId || DEFAULT_FIRM_ID();
    let conditions = [eq(students.firm_id, firmId), eq(students.status, 'registered')];

    let list;
    if (search) {
      const term = `%${search}%`;
      list = await db.select().from(students)
        .where(and(...conditions, or(ilike(students.first_name, term), ilike(students.last_name, term), ilike(students.email, term))));
    } else {
      list = await db.select().from(students).where(and(...conditions));
    }

    res.json(list);
  } catch (error) {
    console.error('Get registered students error:', error);
    res.status(500).json({ message: 'Failed to get registered students' });
  }
};

exports.getPendingContacts = async (req, res) => {
  try {
    const firmId = req.context?.firmId || DEFAULT_FIRM_ID();
    const pending = await db.select().from(students)
      .where(and(eq(students.firm_id, firmId), eq(students.status, 'pending')));
    res.json(pending);
  } catch (error) {
    console.error('Get pending contacts error:', error);
    res.status(500).json({ message: 'Failed to get pending contacts' });
  }
};

exports.approveContactRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.context?.firmId || DEFAULT_FIRM_ID();

    const [student] = await db.select().from(students)
      .where(and(eq(students.id, id), eq(students.firm_id, firmId))).limit(1);
    if (!student) return res.status(404).json({ message: 'Contact request not found' });
    if (student.status !== 'pending') return res.status(400).json({ message: 'This contact has already been processed' });

    const contactEmail = student.email;
    if (!contactEmail) return res.status(400).json({ message: 'Contact request is missing an email address' });

    const username = contactEmail.toLowerCase();

    const [existingOther] = await db.select({ id: students.id }).from(students)
      .where(and(eq(students.email, username), eq(students.firm_id, firmId), ne(students.id, id))).limit(1);
    if (existingOther) {
      return res.status(400).json({ message: 'Another student already uses this email.' });
    }

    const [existingAdmin] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.email, username), eq(users.firm_id, firmId))).limit(1);
    if (existingAdmin) {
      return res.status(400).json({ message: 'An administrator account already uses this email.' });
    }

    const [updated] = await db.update(students)
      .set({ status: 'registered', updated_at: new Date() })
      .where(eq(students.id, id))
      .returning();

    const name = getStudentName(updated);
    const invite = await sendStudentInviteEmail({ email: username, name });

    res.json({
      message: invite.emailSent
        ? 'Contact approved and login instructions sent successfully.'
        : 'Contact approved, but the email could not be delivered automatically.',
      student: { id: updated.id, email: updated.email },
      inviteSent: invite.emailSent,
      loginLink: invite.loginLink,
    });
  } catch (error) {
    console.error('Approve contact request error:', error);
    res.status(500).json({ message: error.message || 'Failed to approve contact request.' });
  }
};

exports.activateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.context?.firmId || DEFAULT_FIRM_ID();

    const [student] = await db.select().from(students)
      .where(and(eq(students.id, id), eq(students.firm_id, firmId))).limit(1);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    if (!['pending', 'registered'].includes(student.status)) {
      return res.status(400).json({ message: 'Student cannot be activated' });
    }

    const contactEmail = student.email?.trim()?.toLowerCase();
    if (!contactEmail) {
      return res.status(400).json({ message: 'Student is missing an email address.' });
    }

    // Ensure default required document defs exist
    const defs = getDocDefs(student);
    ensureDefaultDocDefs(defs);
    const newStateData = { ...(student.state_data ?? {}), doc_defs: defs };

    const [updated] = await db.update(students)
      .set({ status: 'active', state_data: newStateData, updated_at: new Date() })
      .where(eq(students.id, id))
      .returning();

    try {
      const studentName = getStudentName(updated);
      const dashboardUrl = `${getAppBaseUrl()}/student/dashboard`;
      await sendEmail({
        to: contactEmail,
        subject: 'Your Immigration CRM portal is now active',
        html: `
          <div style="font-family: 'Inter', Arial, sans-serif; line-height: 1.7; color: #0f172a;">
            <h1 style="margin-bottom: 12px;">Welcome aboard, ${studentName}!</h1>
            <p>Your profile has been reviewed and your Immigration CRM portal is officially active.</p>
            <a href="${dashboardUrl}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;font-weight:600;text-decoration:none;">Access my dashboard</a>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send activation email:', emailError);
    }

    res.json({
      message: 'Student account activated successfully',
      student: { id: updated.id, aiKey: updated.ai_key, email: updated.email },
    });
  } catch (error) {
    console.error('Activate student error:', error);
    res.status(500).json({ message: 'Failed to activate student' });
  }
};

exports.getStudentByKey = async (req, res) => {
  try {
    const [student] = await db.select().from(students)
      .where(eq(students.ai_key, req.params.aiKey)).limit(1);
    if (!student) return res.status(404).json({ message: 'Not found' });
    res.json(student);
  } catch (error) {
    console.error('Get student by key error:', error);
    res.status(500).json({ message: 'Failed to get student' });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const [student] = await db.select().from(students)
      .where(eq(students.id, req.params.id)).limit(1);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ message: 'Failed to get student' });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, status, stage, profile_data, state_data } = req.body;

    const allowedFields = {};
    if (first_name !== undefined) allowedFields.first_name = first_name;
    if (last_name !== undefined) allowedFields.last_name = last_name;
    if (email !== undefined) allowedFields.email = email;
    if (status !== undefined) allowedFields.status = status;
    if (stage !== undefined) allowedFields.stage = stage;
    if (profile_data !== undefined) allowedFields.profile_data = profile_data;
    if (state_data !== undefined) allowedFields.state_data = state_data;
    allowedFields.updated_at = new Date();

    const [updated] = await db.update(students)
      .set(allowedFields)
      .where(eq(students.id, id))
      .returning();

    if (!updated) return res.status(404).json({ message: 'Student not found' });

    res.json({ message: 'Student updated successfully', student: updated });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ message: 'Failed to update student' });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.delete(students).where(eq(students.id, id)).returning({ id: students.id });
    if (!result.length) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ message: 'Failed to delete student' });
  }
};

// ─── Self-service profile update ──────────────────────────────────────────────

const normalizePassportDateValue = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  if (typeof value === 'string') {
    const match = value.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) {
      const normalized = new Date(match[1]);
      if (!Number.isNaN(normalized.getTime())) return normalized.toISOString().slice(0, 10);
    }
  }
  return value;
};

const sanitizePassportDetails = (details = {}) => {
  if (!details || typeof details !== 'object') return {};
  const cleaned = {};
  if (details.fullName) cleaned.fullName = details.fullName.trim();
  if (details.number) cleaned.number = details.number.trim();
  if (details.dateOfBirth) cleaned.dateOfBirth = normalizePassportDateValue(details.dateOfBirth);
  if (details.expiryDate) cleaned.expiryDate = normalizePassportDateValue(details.expiryDate);
  if (Object.keys(cleaned).length) {
    cleaned.source = 'manual';
    cleaned.manuallyUpdated = true;
    cleaned.updatedAt = new Date();
  }
  return cleaned;
};

exports.updateSelfProfile = async (req, res) => {
  try {
    const { profile = {}, contactInfo = {} } = req.body || {};
    const [student] = await db.select().from(students).where(eq(students.id, req.userId)).limit(1);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (student.status === 'closed') return res.status(403).json({ message: 'Account inactive' });

    let profileData = { ...(student.profile_data ?? {}) };

    if (profile && typeof profile === 'object') {
      const cleanedPassport = sanitizePassportDetails(profile.passportDetails);
      if (cleanedPassport && Object.keys(cleanedPassport).length) {
        profileData.passportDetails = { ...(profileData.passportDetails || {}), ...cleanedPassport };
      }
      const { passportDetails: _ignored, ...rest } = profile;
      if (Object.keys(rest).length) profileData = { ...profileData, ...rest };
    }

    if (contactInfo && typeof contactInfo === 'object' && Object.keys(contactInfo).length) {
      profileData = { ...profileData, ...contactInfo };
    }

    const scores = ['listeningScore', 'readingScore', 'writingScore', 'speakingScore'];
    if (scores.every((k) => Number.isFinite(Number(profileData[k])))) {
      profileData.overallScore = Math.round((scores.map((k) => Number(profileData[k])).reduce((a, b) => a + b, 0) / 4) * 2) / 2;
    }

    const [updated] = await db.update(students)
      .set({ profile_data: profileData, updated_at: new Date() })
      .where(eq(students.id, req.userId))
      .returning();

    res.json({ message: 'Profile updated', student: updated });
  } catch (error) {
    console.error('Update self profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

// ─── Create student (admin) ───────────────────────────────────────────────────

exports.createStudent = async (req, res) => {
  try {
    const { name, email, phone, message, status = 'active', profile = {} } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'Name and email are required' });

    const normalizedEmail = email.trim().toLowerCase();
    const firmId = req.context?.firmId || DEFAULT_FIRM_ID();

    const [existingStudent] = await db.select({ id: students.id }).from(students)
      .where(and(eq(students.email, normalizedEmail), eq(students.firm_id, firmId))).limit(1);
    if (existingStudent) return res.status(400).json({ message: 'A student with this email already exists' });

    const [existingAdmin] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.email, normalizedEmail), eq(users.firm_id, firmId))).limit(1);
    if (existingAdmin) return res.status(400).json({ message: 'An admin already uses this email' });

    const validStatuses = ['active', 'pending', 'registered'];
    const nameParts = name.trim().split(' ');
    const aiKey = `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const defs = {};
    ensureDefaultDocDefs(defs);

    const [inserted] = await db.insert(students).values({
      firm_id: firmId,
      ai_key: aiKey,
      status: validStatuses.includes(status) ? status : 'registered',
      email: normalizedEmail,
      first_name: nameParts[0] || name,
      last_name: nameParts.slice(1).join(' ') || null,
      profile_data: { ...profile, fullName: name, email: normalizedEmail, phone: phone || '', message: message || '' },
      state_data: { doc_defs: defs },
    }).returning();

    const invite = await sendStudentInviteEmail({ email: normalizedEmail, name });

    try {
      const adminRecipients = await getAdminNotificationEmails();
      if (adminRecipients.length) {
        await sendEmail({
          to: adminRecipients.join(', '),
          subject: 'Student account created',
          html: `<p>${name} (${normalizedEmail}) has been added${invite.emailSent ? ' and login instructions were delivered.' : '.'}</p>`,
        });
      }
    } catch (notifyError) {
      console.error('Failed to send admin notification email:', notifyError);
    }

    res.status(201).json({
      message: invite.emailSent
        ? 'Student created successfully and login instructions sent.'
        : 'Student created successfully, but the invitation email could not be delivered automatically.',
      student: { id: inserted.id, email: inserted.email, status: inserted.status },
      inviteSent: invite.emailSent,
      loginLink: invite.loginLink,
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ message: 'Failed to create student' });
  }
};

// ─── Generic S3 file management ───────────────────────────────────────────────

exports.getStudentFiles = async (req, res) => {
  try {
    const { aiKey } = req.params;
    const [student] = await db.select().from(students).where(eq(students.ai_key, aiKey)).limit(1);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    let docRows = await db.select().from(documents)
      .where(and(eq(documents.student_id, student.id), isNull(documents.document_type)));

    if (!docRows.length) {
      try {
        const s3Objects = await listStudentFiles(aiKey);
        if (Array.isArray(s3Objects) && s3Objects.length) {
          const inserts = s3Objects.map((obj) => {
            const key = obj.Key;
            const name = key.replace(`${aiKey}/`, '') || path.basename(key);
            return {
              firm_id: student.firm_id,
              student_id: student.id,
              s3_key: key,
              s3_bucket: env.AWS_S3_BUCKET_NAME,
              mime_type: getMimeType(name),
              size_bytes: obj.Size || 0,
              document_type: null,
              ai_verification: { name },
            };
          });
          docRows = await db.insert(documents).values(inserts).returning();
        }
      } catch (fallbackError) {
        console.error(`Failed to rebuild document metadata from S3 for ${aiKey}:`, fallbackError.message);
      }
    }

    const filesWithUrls = await Promise.all(
      docRows.map(async (row) => {
        const name = row.ai_verification?.name || path.basename(row.s3_key || '');
        try {
          const url = await getPresignedUrl(row.s3_key, name);
          return { id: row.id, key: row.s3_key, bucket: row.s3_bucket, name, mimeType: row.mime_type, size: row.size_bytes, uploadedAt: row.created_at, url };
        } catch {
          return { id: row.id, key: row.s3_key, bucket: row.s3_bucket, name, mimeType: row.mime_type, size: row.size_bytes, uploadedAt: row.created_at, url: null };
        }
      })
    );

    res.json({ files: filesWithUrls, totalFiles: filesWithUrls.length });
  } catch (error) {
    console.error('Get student files error:', error);
    res.status(500).json({ error: 'Failed to retrieve documents' });
  }
};

exports.renameStudentDocument = async (req, res) => {
  try {
    const { aiKey, documentId } = req.params;
    const { newName } = req.body;

    if (!newName || !newName.trim()) {
      return res.status(400).json({ success: false, message: 'New document name is required' });
    }

    const [student] = await db.select().from(students).where(eq(students.ai_key, aiKey)).limit(1);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    if (!canManageStudentDocuments(req.user, student)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const [doc] = await db.select().from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.student_id, student.id))).limit(1);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    const sanitized = newName.trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ');
    const ext = path.extname(doc.ai_verification?.name || doc.s3_key || '');
    const finalName = !path.extname(sanitized) && ext ? sanitized + ext : sanitized;

    const newVerification = { ...(doc.ai_verification ?? {}), name: finalName };
    const [updated] = await db.update(documents)
      .set({ ai_verification: newVerification })
      .where(eq(documents.id, documentId))
      .returning();

    const url = await getPresignedUrl(updated.s3_key, finalName);
    res.json({ success: true, message: 'Document renamed successfully', document: { ...mapDocRowForResponse(updated), url } });
  } catch (error) {
    console.error('Rename document error:', error);
    res.status(500).json({ success: false, message: 'Failed to rename document' });
  }
};

exports.deleteStudentDocument = async (req, res) => {
  try {
    const { aiKey, documentId } = req.params;
    const [student] = await db.select().from(students).where(eq(students.ai_key, aiKey)).limit(1);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const [doc] = await db.select().from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.student_id, student.id))).limit(1);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    if (doc.s3_key) {
      try { await deleteS3Object(doc.s3_key); } catch (s3Err) {
        console.error('Failed to delete from S3:', s3Err.message);
      }
    }

    await db.delete(documents).where(eq(documents.id, documentId));
    return res.json({ success: true, message: 'Document deleted successfully', documentId });
  } catch (error) {
    console.error('Delete document error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete document' });
  }
};

// ─── Required Documents ───────────────────────────────────────────────────────

exports.getRequiredDocuments = async (req, res) => {
  try {
    const { aiKey } = req.params;
    const [student] = await db.select().from(students).where(eq(students.ai_key, aiKey)).limit(1);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const isAdmin = ['admin', 'senior', 'junior'].includes(req.user?.role);
    const isOwner = req.user?.role === 'student' && (req.user?.ai_key || req.user?.aiKey) === aiKey;
    if (!isAdmin && !isOwner) return res.status(403).json({ message: 'Access denied' });

    const defs = getDocDefs(student);
    const changed = ensureDefaultDocDefs(defs);
    let currentStudent = student;
    if (changed) currentStudent = await saveDocDefs(student.id, defs, student);

    const slugs = Object.keys(defs);
    const filesMap = await getDocFilesMap(student.id, slugs);
    const requiredDocuments = slugs.map((slug) => formatRequiredDoc(slug, defs[slug], filesMap[slug] || []));

    return res.json({ success: true, requiredDocuments });
  } catch (error) {
    console.error('Get required docs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch required documents' });
  }
};

exports.addRequiredDocument = async (req, res) => {
  try {
    const { aiKey } = req.params;
    const { name, description, aiExtractionEnabled } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ message: 'Document name required' });

    const [student] = await db.select().from(students).where(eq(students.ai_key, aiKey)).limit(1);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const slug = createDocumentSlug(name);
    const defs = { ...getDocDefs(student) };
    defs[slug] = {
      name: name.trim(),
      description: description?.toString()?.trim() || '',
      slug,
      aiExtractionEnabled: typeof aiExtractionEnabled === 'boolean' ? aiExtractionEnabled : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = await saveDocDefs(student.id, defs, student);
    const newDefs = getDocDefs(updated);
    const slugs = Object.keys(newDefs);
    const filesMap = await getDocFilesMap(student.id, slugs);
    const requiredDocuments = slugs.map((s) => formatRequiredDoc(s, newDefs[s], filesMap[s] || []));

    notifyStudentAboutRequiredDoc(student, name.trim()).catch(() => {});

    return res.json({ success: true, requiredDocuments });
  } catch (error) {
    console.error('Add required doc error:', error);
    res.status(500).json({ success: false, message: 'Failed to add required document' });
  }
};

exports.deleteRequiredDocument = async (req, res) => {
  try {
    const { aiKey, docId } = req.params;
    const [student] = await db.select().from(students).where(eq(students.ai_key, aiKey)).limit(1);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const isAdmin = ['admin', 'senior', 'junior'].includes(req.user?.role);
    const isOwner = req.user?.role === 'student' && (req.user?.ai_key || req.user?.aiKey) === aiKey;
    if (!isAdmin && !isOwner) return res.status(403).json({ message: 'Access denied' });

    const defs = { ...getDocDefs(student) };
    if (!defs[docId]) return res.status(404).json({ message: 'Document not found' });

    // Delete all files for this doc slot from S3 + db
    const fileRows = await db.select().from(documents)
      .where(and(eq(documents.student_id, student.id), eq(documents.document_type, docId)));
    for (const row of fileRows) {
      if (row.s3_key) {
        try { await deleteS3Object(row.s3_key); } catch (e) { console.error('S3 delete failed:', e.message); }
      }
    }
    if (fileRows.length) {
      await db.delete(documents)
        .where(and(eq(documents.student_id, student.id), eq(documents.document_type, docId)));
    }

    // Dismiss any open verification tasks for files in this doc
    const fileIds = fileRows.map((r) => r.id);
    if (fileIds.length) {
      await db.update(tasks).set({ status: 'dismissed', updated_at: new Date() })
        .where(and(eq(tasks.firm_id, student.firm_id), eq(tasks.task_type, 'ai_verification'), inArray(tasks.document_id, fileIds)));
    }

    delete defs[docId];
    const updated = await saveDocDefs(student.id, defs, student);
    const newDefs = getDocDefs(updated);
    const slugs = Object.keys(newDefs);
    const filesMap = await getDocFilesMap(student.id, slugs);
    const requiredDocuments = slugs.map((s) => formatRequiredDoc(s, newDefs[s], filesMap[s] || []));

    return res.json({ success: true, requiredDocuments });
  } catch (error) {
    console.error('Delete required doc error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete required document' });
  }
};

exports.updateRequiredDocumentSettings = async (req, res) => {
  try {
    const { aiKey, docId } = req.params;
    const { name, description, aiExtractionEnabled } = req.body || {};

    const [student] = await db.select().from(students).where(eq(students.ai_key, aiKey)).limit(1);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const defs = { ...getDocDefs(student) };
    if (!defs[docId]) return res.status(404).json({ message: 'Document not found' });

    const def = { ...defs[docId] };
    if (typeof name === 'string' && name.trim()) def.name = name.trim();
    if (typeof description === 'string') def.description = description.trim();
    else if (description === null) def.description = '';
    if (typeof aiExtractionEnabled === 'boolean') def.aiExtractionEnabled = aiExtractionEnabled;
    def.updatedAt = new Date().toISOString();
    defs[docId] = def;

    const updated = await saveDocDefs(student.id, defs, student);
    const newDefs = getDocDefs(updated);
    const fileRows = await db.select().from(documents)
      .where(and(eq(documents.student_id, student.id), eq(documents.document_type, docId)));

    return res.json({ success: true, document: formatRequiredDoc(docId, newDefs[docId], fileRows) });
  } catch (error) {
    console.error('Update required doc settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update required document settings' });
  }
};

// ─── Required-doc file upload ─────────────────────────────────────────────────

const processRequiredDocumentUpload = async ({ student, slug, defData, file, uploadOptions = {} }) => {
  const {
    fileSource = 'manual',
    uploadedBy = null,
    uploadedByRole = 'student',
    skipVerification = false,
    skipExtraction = false,
  } = uploadOptions;

  const studentDisplayName = getStudentName(student);
  const extension = guessExtension(file.originalname, file.mimetype);
  const renamedFileName = buildRequiredDocFileName({
    fieldName: defData.name || 'Document',
    studentName: studentDisplayName,
    extension,
  });

  const aiContext = { firmId: student.firm_id, relatedEntityType: 'student', relatedEntityId: student.id };

  let extractedProfile = null;
  if (!skipExtraction && defData.aiExtractionEnabled) {
    try { extractedProfile = await extractProfileWithAI([file], aiContext); } catch (e) { console.error('AI extraction failed:', e); }
  }

  let verificationResult = { status: 'pending', confidence: 0, detectedType: '', reason: 'Verification skipped', checkedAt: new Date() };
  if (!skipVerification) {
    try {
      verificationResult = await verifyDocumentType({ expectedType: defData.name, filePath: file.path, mimeType: file.mimetype }, aiContext);
    } catch (e) { console.error('AI document verification failed:', e); }
  }

  const s3Prefix = `${student.ai_key || 'student'}/required/${slug}`;
  const uploadResult = await uploadFileToS3(file.path, renamedFileName, s3Prefix);

  // Insert document row
  const [docRow] = await db.insert(documents).values({
    firm_id: student.firm_id,
    student_id: student.id,
    s3_key: uploadResult.key,
    s3_bucket: uploadResult.bucket,
    mime_type: file.mimetype,
    size_bytes: file.size,
    document_type: slug,
    uploaded_by: uploadedBy,
    ai_verification: {
      name: renamedFileName,
      uploadedByRole,
      status: verificationResult.status,
      confidence: verificationResult.confidence,
      detectedType: verificationResult.detectedType,
      reason: verificationResult.reason,
      checkedAt: verificationResult.checkedAt || new Date(),
    },
  }).returning();

  // Create verification task if not verified
  if (!skipVerification) {
    if (verificationResult.status !== 'verified') {
      try {
        await createAIVerificationTask(
          docRow.id,
          verificationResult,
          null,
          { firmId: student.firm_id, studentId: student.id }
        );
      } catch (e) { console.error('Failed to create verification task:', e); }
    } else {
      // Dismiss any existing open verification tasks for this slot
      const slotFiles = await db.select({ id: documents.id }).from(documents)
        .where(and(eq(documents.student_id, student.id), eq(documents.document_type, slug)));
      const fileIds = slotFiles.map((r) => r.id);
      if (fileIds.length) {
        await db.update(tasks).set({ status: 'dismissed', updated_at: new Date() })
          .where(and(eq(tasks.firm_id, student.firm_id), eq(tasks.task_type, 'ai_verification'), inArray(tasks.document_id, fileIds)));
      }
    }
  }

  // Merge AI-extracted profile data
  if (extractedProfile && Object.keys(extractedProfile).length) {
    try {
      const prioritized = prioritizeFields(extractedProfile);
      if (Object.keys(prioritized).length) await upsertStudent({ aiKey: student.ai_key, profile: prioritized });
    } catch (e) { console.error('Failed to persist AI extraction:', e); }
  }

  return { docRow, uploadResult, verificationResult, extractedProfile };
};

exports.uploadRequiredDocumentFile = async (req, res) => {
  try {
    const { aiKey, docId } = req.params;
    const { documentType } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ message: 'File is required' });

    const isAISystemUpload = !req.user || (documentType && !docId);
    const actorRole = req.user?.role || 'ai_assistant';

    if (!isAISystemUpload) {
      const isAdmin = ['admin', 'senior', 'junior'].includes(actorRole);
      const isOwner = actorRole === 'student' && (req.user?.ai_key || req.user?.aiKey) === aiKey;
      if (!isAdmin && !isOwner) { deleteLocalFile(file.path); return res.status(403).json({ message: 'Access denied' }); }
    }

    const [student] = await db.select().from(students).where(eq(students.ai_key, aiKey)).limit(1);
    if (!student) { deleteLocalFile(file.path); return res.status(404).json({ message: 'Student not found' }); }

    let slug, defData;
    const defs = { ...getDocDefs(student) };

    if (docId) {
      if (!defs[docId]) { deleteLocalFile(file.path); return res.status(404).json({ message: 'Document not found' }); }
      slug = docId;
      defData = defs[docId];
    } else if (documentType) {
      const normalizedType = documentType.trim();
      if (!normalizedType) { deleteLocalFile(file.path); return res.status(400).json({ message: 'Document type is required' }); }
      // Find by name match
      const existingEntry = Object.entries(defs).find(([, d]) => d.name.toLowerCase() === normalizedType.toLowerCase());
      if (existingEntry) {
        [slug, defData] = existingEntry;
      } else {
        slug = createDocumentSlug(normalizedType);
        defData = { name: normalizedType, description: '', slug, aiExtractionEnabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        defs[slug] = defData;
        await saveDocDefs(student.id, defs, student);
      }
    } else {
      deleteLocalFile(file.path);
      return res.status(400).json({ message: 'Either docId or documentType is required' });
    }

    const fileSource = isAISystemUpload ? 'ai' : actorRole === 'admin' ? 'admin' : 'manual';
    const uploadedBy = req.user?.id || null;

    const { docRow, verificationResult } = await processRequiredDocumentUpload({
      student, slug, defData, file,
      uploadOptions: { fileSource, uploadedBy, uploadedByRole: actorRole, skipVerification: false, skipExtraction: false },
    });

    if (file.path) deleteLocalFile(file.path);

    // Reload student for fresh defs, then get files for this slot
    const [freshStudent] = await db.select().from(students).where(eq(students.id, student.id)).limit(1);
    const freshDefs = getDocDefs(freshStudent);
    const fileRows = await db.select().from(documents)
      .where(and(eq(documents.student_id, student.id), eq(documents.document_type, slug)));

    res.json({ success: true, document: formatRequiredDoc(slug, freshDefs[slug] || defData, fileRows) });
  } catch (error) {
    console.error('Upload required doc file error:', error);
    if (req.file?.path) deleteLocalFile(req.file.path);
    res.status(500).json({ success: false, message: 'Failed to upload document' });
  }
};

exports.listRequiredDocumentFiles = async (req, res) => {
  try {
    const { aiKey, docId } = req.params;
    const [student] = await db.select().from(students).where(eq(students.ai_key, aiKey)).limit(1);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const isAdmin = ['admin', 'senior', 'junior'].includes(req.user?.role);
    const isOwner = req.user?.role === 'student' && (req.user?.ai_key || req.user?.aiKey) === aiKey;
    if (!isAdmin && !isOwner) return res.status(403).json({ message: 'Access denied' });

    const defs = getDocDefs(student);
    if (!defs[docId]) return res.status(404).json({ message: 'Document not found' });

    const fileRows = await db.select().from(documents)
      .where(and(eq(documents.student_id, student.id), eq(documents.document_type, docId)));
    const formatted = formatRequiredDoc(docId, defs[docId], fileRows);
    res.json({ success: true, document: formatted, files: formatted.files });
  } catch (error) {
    console.error('List required doc files error:', error);
    res.status(500).json({ success: false, message: 'Failed to list document files' });
  }
};

exports.getRequiredDocumentFileUrl = async (req, res) => {
  try {
    const { aiKey, docId, fileId } = req.params;
    const [student] = await db.select().from(students).where(eq(students.ai_key, aiKey)).limit(1);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const isAdmin = ['admin', 'senior', 'junior'].includes(req.user?.role);
    const isOwner = req.user?.role === 'student' && (req.user?.ai_key || req.user?.aiKey) === aiKey;
    if (!isAdmin && !isOwner) return res.status(403).json({ message: 'Access denied' });

    const defs = getDocDefs(student);
    if (!defs[docId]) return res.status(404).json({ message: 'Document not found' });

    const [fileRow] = await db.select().from(documents)
      .where(and(eq(documents.id, fileId), eq(documents.student_id, student.id), eq(documents.document_type, docId))).limit(1);
    if (!fileRow) return res.status(404).json({ message: 'File not found' });

    const name = fileRow.ai_verification?.name || path.basename(fileRow.s3_key || '');
    const url = await getPresignedUrl(fileRow.s3_key, name);
    res.json({ success: true, url });
  } catch (error) {
    console.error('Get required doc file url error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate file link' });
  }
};

exports.deleteRequiredDocumentFile = async (req, res) => {
  try {
    const { aiKey, docId, fileId } = req.params;
    const [student] = await db.select().from(students).where(eq(students.ai_key, aiKey)).limit(1);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const isAdmin = ['admin', 'senior', 'junior'].includes(req.user?.role);
    const isOwner = req.user?.role === 'student' && (req.user?.ai_key || req.user?.aiKey) === aiKey;
    if (!isAdmin && !isOwner) return res.status(403).json({ message: 'Access denied' });

    const defs = getDocDefs(student);
    if (!defs[docId]) return res.status(404).json({ message: 'Document not found' });

    const [fileRow] = await db.select().from(documents)
      .where(and(eq(documents.id, fileId), eq(documents.student_id, student.id), eq(documents.document_type, docId))).limit(1);
    if (!fileRow) return res.status(404).json({ message: 'File not found' });

    if (fileRow.s3_key) {
      try { await deleteS3Object(fileRow.s3_key); } catch (e) { console.error('Failed to delete S3 object:', e.message); }
    }

    // Dismiss open verification tasks for this file
    await db.update(tasks).set({ status: 'dismissed', updated_at: new Date() })
      .where(and(eq(tasks.firm_id, student.firm_id), eq(tasks.task_type, 'ai_verification'), eq(tasks.document_id, fileId)));

    await db.delete(documents).where(eq(documents.id, fileId));

    const fileRows = await db.select().from(documents)
      .where(and(eq(documents.student_id, student.id), eq(documents.document_type, docId)));
    res.json({ success: true, document: formatRequiredDoc(docId, defs[docId], fileRows) });
  } catch (error) {
    console.error('Delete required doc file error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete file' });
  }
};

exports.verifyRequiredDocumentFile = async (req, res) => {
  try {
    const { aiKey, docId, fileId } = req.params;
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

    const [student] = await db.select().from(students).where(eq(students.ai_key, aiKey)).limit(1);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const defs = getDocDefs(student);
    if (!defs[docId]) return res.status(404).json({ message: 'Document not found' });

    const [fileRow] = await db.select().from(documents)
      .where(and(eq(documents.id, fileId), eq(documents.student_id, student.id), eq(documents.document_type, docId))).limit(1);
    if (!fileRow) return res.status(404).json({ message: 'File not found' });

    const [updated] = await db.update(documents).set({
      ai_verification: {
        ...(fileRow.ai_verification ?? {}),
        status: 'verified',
        confidence: 1,
        detectedType: fileRow.ai_verification?.detectedType || defs[docId].name || 'Document',
        reason: 'Verified by admin',
        checkedAt: new Date(),
      },
    }).where(eq(documents.id, fileId)).returning();

    // Dismiss open verification tasks for this file
    await db.update(tasks).set({ status: 'dismissed', updated_at: new Date() })
      .where(and(eq(tasks.firm_id, student.firm_id), eq(tasks.task_type, 'ai_verification'), eq(tasks.document_id, fileId)));

    const fileRows = await db.select().from(documents)
      .where(and(eq(documents.student_id, student.id), eq(documents.document_type, docId)));
    res.json({ success: true, document: formatRequiredDoc(docId, defs[docId], fileRows) });
  } catch (error) {
    console.error('Verify required doc file error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify document' });
  }
};

// ─── Student Tasks (via tasks table) ─────────────────────────────────────────

exports.listStudentTasks = async (req, res) => {
  try {
    const { aiKey } = req.params;
    const { markSeen } = req.query;
    const [student] = await db.select().from(students).where(eq(students.ai_key, aiKey)).limit(1);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const isAdmin = ['admin', 'senior', 'junior'].includes(req.user?.role);
    const isOwner = req.user?.role === 'student' && (req.user?.ai_key || req.user?.aiKey) === aiKey;
    if (!isAdmin && !isOwner) return res.status(403).json({ message: 'Access denied' });

    const taskRows = await db.select().from(tasks)
      .where(and(eq(tasks.student_id, student.id), eq(tasks.firm_id, student.firm_id)))
      .orderBy(desc(tasks.created_at));

    if (isOwner && markSeen === 'true') {
      const unreadIds = taskRows.filter((t) => !t.is_read).map((t) => t.id);
      if (unreadIds.length) {
        await db.update(tasks).set({ is_read: true, updated_at: new Date() })
          .where(inArray(tasks.id, unreadIds));
        taskRows.forEach((t) => { if (unreadIds.includes(t.id)) t.is_read = true; });
      }
    }

    res.json({ success: true, tasks: taskRows.map(formatStudentTask) });
  } catch (error) {
    console.error('List student tasks error:', error);
    res.status(500).json({ success: false, message: 'Failed to load tasks' });
  }
};

exports.createStudentTask = async (req, res) => {
  try {
    const { aiKey } = req.params;
    const { title, description, dueDate } = req.body || {};
    if (!title || !title.trim()) return res.status(400).json({ message: 'Task title is required' });

    const [student] = await db.select().from(students).where(eq(students.ai_key, aiKey)).limit(1);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    let due_at = null;
    if (dueDate) {
      const candidate = new Date(dueDate);
      if (Number.isNaN(candidate.getTime())) return res.status(400).json({ message: 'Invalid due date' });
      due_at = candidate;
    }

    let attachment = null;
    if (req.file) {
      try {
        const safeName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
        const uploadResult = await uploadFileToS3(req.file.path, safeName, `${student.ai_key || 'student'}/tasks`);
        attachment = { key: uploadResult.key, bucket: uploadResult.bucket, name: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size };
      } finally {
        if (req.file?.path) deleteLocalFile(req.file.path);
      }
    }

    const [newTask] = await db.insert(tasks).values({
      firm_id: student.firm_id,
      student_id: student.id,
      task_type: 'general',
      title: title.trim(),
      description: description?.toString()?.trim() || null,
      status: 'open',
      created_by: req.user?.id || null,
      due_at,
      metadata: attachment ? { attachment } : {},
    }).returning();

    await sendTaskAssignedEmail({ student, task: newTask });

    const allTasks = await db.select().from(tasks)
      .where(and(eq(tasks.student_id, student.id), eq(tasks.firm_id, student.firm_id)))
      .orderBy(desc(tasks.created_at));

    res.json({ success: true, tasks: allTasks.map(formatStudentTask) });
  } catch (error) {
    console.error('Create student task error:', error);
    res.status(500).json({ success: false, message: 'Failed to create task' });
  }
};

exports.updateStudentTask = async (req, res) => {
  try {
    const { aiKey, taskId } = req.params;
    const { status, seenByStudent } = req.body || {};

    const [student] = await db.select().from(students).where(eq(students.ai_key, aiKey)).limit(1);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const [task] = await db.select().from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.student_id, student.id))).limit(1);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isAdmin = ['admin', 'senior', 'junior'].includes(req.user?.role);
    const isOwner = req.user?.role === 'student' && (req.user?.ai_key || req.user?.aiKey) === aiKey;
    if (!isAdmin && !isOwner) return res.status(403).json({ message: 'Access denied' });

    const updates = { updated_at: new Date() };
    let statusUpdatedToCompleted = false;

    if (status) {
      const pgStatus = status === 'completed' ? 'done' : status === 'pending' ? 'open' : status;
      if (['open', 'done', 'in_progress', 'dismissed'].includes(pgStatus)) {
        updates.status = pgStatus;
        if (pgStatus === 'done' && task.status !== 'done') {
          updates.completed_at = new Date();
          statusUpdatedToCompleted = true;
        }
      }
    }

    if (typeof seenByStudent === 'boolean' && isOwner) {
      updates.is_read = seenByStudent;
    }

    const [updated] = await db.update(tasks).set(updates).where(eq(tasks.id, taskId)).returning();

    if (statusUpdatedToCompleted && req.userRole === 'student' && task.created_by) {
      try {
        await sendNotification(
          student.firm_id,
          task.created_by,
          'TASK_COMPLETED',
          'Task completed',
          `${getStudentName(student)} completed: ${task.title}`,
          { studentId: student.id, studentAiKey: student.ai_key, taskId: task.id, dueDate: task.due_at },
        );
      } catch (notifyError) {
        console.error('Failed to create task completion notification:', notifyError);
      }
    }

    const allTasks = await db.select().from(tasks)
      .where(and(eq(tasks.student_id, student.id), eq(tasks.firm_id, student.firm_id)))
      .orderBy(desc(tasks.created_at));

    res.json({ success: true, tasks: allTasks.map(formatStudentTask) });
  } catch (error) {
    console.error('Update student task error:', error);
    res.status(500).json({ success: false, message: 'Failed to update task' });
  }
};

exports.getStudentTaskAttachmentUrl = async (req, res) => {
  try {
    const { aiKey, taskId } = req.params;
    const [student] = await db.select().from(students).where(eq(students.ai_key, aiKey)).limit(1);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const [task] = await db.select().from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.student_id, student.id))).limit(1);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isAdmin = ['admin', 'senior', 'junior'].includes(req.user?.role);
    const isOwner = req.user?.role === 'student' && (req.user?.ai_key || req.user?.aiKey) === aiKey;
    if (!isAdmin && !isOwner) return res.status(403).json({ message: 'Access denied' });

    const attachment = task.metadata?.attachment;
    if (!attachment?.key || !attachment?.name) return res.status(404).json({ message: 'Attachment not found' });

    const url = await getPresignedUrl(attachment.key, attachment.name);
    res.json({ success: true, url });
  } catch (error) {
    console.error('Get task attachment url error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate attachment link' });
  }
};

exports.deleteStudentTask = async (req, res) => {
  try {
    const { aiKey, taskId } = req.params;
    const [student] = await db.select().from(students).where(eq(students.ai_key, aiKey)).limit(1);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const [task] = await db.select().from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.student_id, student.id))).limit(1);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isAdmin = ['admin', 'senior', 'junior'].includes(req.user?.role);
    const isOwner = req.user?.role === 'student' && (req.user?.ai_key || req.user?.aiKey) === aiKey;
    if (!isAdmin && !isOwner) return res.status(403).json({ message: 'Access denied' });

    const attachment = task.metadata?.attachment;
    if (attachment?.key) {
      try { await deleteS3Object(attachment.key); } catch (e) { console.error('Failed to delete task attachment:', e.message); }
    }

    await db.delete(tasks).where(eq(tasks.id, taskId));

    const allTasks = await db.select().from(tasks)
      .where(and(eq(tasks.student_id, student.id), eq(tasks.firm_id, student.firm_id)))
      .orderBy(desc(tasks.created_at));

    res.json({ success: true, tasks: allTasks.map(formatStudentTask) });
  } catch (error) {
    console.error('Delete student task error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete task' });
  }
};
