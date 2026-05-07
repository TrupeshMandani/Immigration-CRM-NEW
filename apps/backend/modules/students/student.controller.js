const path = require("path");
const Student = require("../../models/Student");
const File = require("../../models/File");
const Admin = require("../../models/Admin");
const {
  getPresignedUrl,
  deleteS3Object,
  listStudentFiles,
  getMimeType,
  uploadFileToS3,
  deleteLocalFile,
} = require("../s3/s3.service");
const { sendEmail } = require("../../utils/sendEmail");
const env = require("../../config/env");
const { getAdminNotificationEmails } = require("../../utils/adminRecipients");
const { generateAiKey } = require("../../utils/generateAiKey");
const { sendStudentInviteEmail } = require("./student.invite");
const {
  extractProfileWithAI,
} = require("../../AI/ai-file-extract/extract.service");
const { prioritizeFields } = require("../../AI/ai-file-extract/field-priority");
const { upsertStudent } = require("./student.service");
const {
  buildRequiredDocFileName,
  guessExtension,
  getStudentDisplayName,
} = require("../../utils/fileName");
const {
  verifyDocumentType,
} = require("../../AI/ai-document-verify/verification.service");
const {
  createVerificationTask,
  resolveVerificationTasks,
} = require("../tasks/task.service");
const Notification = require("../../models/Notification");
const { emitNotification } = require("../../socket");

const COMPLETED_TASK_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const purgeOldCompletedTasks = async (student) => {
  if (!student || !Array.isArray(student.tasks) || !student.tasks.length)
    return;
  const now = Date.now();
  const retained = [];
  let changed = false;

  for (const task of student.tasks) {
    if (
      task.status === "completed" &&
      task.completedAt &&
      now - new Date(task.completedAt).getTime() > COMPLETED_TASK_TTL_MS
    ) {
      changed = true;
      if (task.attachment?.key) {
        try {
          await deleteS3Object(task.attachment.key);
        } catch (err) {
          console.error(
            "Failed to delete expired task attachment:",
            err.message
          );
        }
      }
      continue;
    }
    retained.push(task);
  }

  if (changed) {
    student.tasks = retained;
    student.markModified("tasks");
    await student.save();
  }
};

const TASK_STATUSES = ["pending", "completed"];

const formatStudentTask = (task) => {
  if (!task) return null;
  const plain = task.toObject ? task.toObject() : task;
  return {
    id: plain._id,
    title: plain.title,
    description: plain.description || "",
    dueDate: plain.dueDate,
    status: plain.status || "pending",
    assignedBy: plain.assignedBy,
    assignedAt: plain.assignedAt,
    completedAt: plain.completedAt,
    seenByStudent: plain.seenByStudent,
    attachment: plain.attachment
      ? {
          key: plain.attachment.key,
          bucket: plain.attachment.bucket,
          name: plain.attachment.name,
          mimeType: plain.attachment.mimeType,
          size: plain.attachment.size,
        }
      : null,
  };
};

const logRequiredDocUpload = ({
  aiKey,
  docId,
  documentName,
  studentName,
  originalName,
  newName,
  userRole,
  userId,
}) => {
  try {
    console.info("[required-docs:upload]", {
      aiKey,
      docId,
      documentName,
      studentName,
      originalName,
      storedName: newName,
      actorRole: userRole,
      actorId: userId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Failed to log required-doc upload event:", err.message);
  }
};

const logDocumentWorkflow = (stage, context = {}) => {
  try {
    console.info(`[doc-workflow] ${stage}`, {
      ...context,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[doc-workflow] failed to log stage", stage, err.message);
  }
};
const getAppBaseUrl = () =>
  (
    env?.APP_BASE_URL ||
    process.env.APP_BASE_URL ||
    "https://portal.example.com"
  ).replace(/\/$/, "");

const canManageStudentDocuments = (user, student) => {
  if (!user || !student) return false;
  if (user.role === "admin") return true;
  if (user.role === "student" && user.aiKey === student.aiKey) return true;
  return false;
};

const getStudentPrimaryEmail = (student) =>
  student?.email || student?.username || student?.contactInfo?.email || null;

const sendTaskAssignedEmail = async ({ student, task }) => {
  const recipient = getStudentPrimaryEmail(student);
  if (!recipient) return;

  try {
    await sendEmail({
      to: recipient,
      subject: `New task assigned: ${task.title}`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; color: #0f172a; line-height: 1.6;">
          <h2 style="margin-bottom: 12px; color: #1d4ed8;">New task assigned</h2>
          <p style="margin: 0 0 12px 0;">You have been assigned a new task: <strong>${
            task.title
          }</strong>.</p>
          ${
            task.description
              ? `<p style="margin: 0 0 12px 0;">${task.description}</p>`
              : ""
          }
          ${
            task.dueDate
              ? `<p style="margin: 0 0 12px 0;">Due date: <strong>${new Date(
                  task.dueDate
                ).toLocaleDateString()}</strong></p>`
              : ""
          }
          <p style="margin: 0 0 12px 0;">Please log into your portal to review the full details and upload any requested files.</p>
          <p style="margin: 0;">Thank you,<br/>Immigration CRM Team</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send task email:", error.message);
  }
};

// list all students (admin only)
exports.getAllStudents = async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { "contactInfo.name": { $regex: search, $options: "i" } },
        { "contactInfo.email": { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    const list = await Student.find(query).sort({ _id: -1 });
    res.json(list);
  } catch (error) {
    console.error("Get students error:", error);
    res.status(500).json({ message: "Failed to get students" });
  }
};

exports.getRegisteredStudents = async (req, res) => {
  try {
    const { search } = req.query;
    const query = { status: "registered" };

    if (search) {
      query.$or = [
        { "contactInfo.name": { $regex: search, $options: "i" } },
        { "contactInfo.email": { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    const list = await Student.find(query).sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    console.error("Get registered students error:", error);
    res.status(500).json({ message: "Failed to get registered students" });
  }
};

// get pending contact requests (admin only)
exports.getPendingContacts = async (req, res) => {
  try {
    const pending = await Student.find({ status: "pending" }).sort({ _id: -1 });
    res.json(pending);
  } catch (error) {
    console.error("Get pending contacts error:", error);
    res.status(500).json({ message: "Failed to get pending contacts" });
  }
};

// approve contact request (admin only)
exports.approveContactRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: "Contact request not found" });
    }

    if (student.status !== "pending") {
      return res
        .status(400)
        .json({ message: "This contact has already been processed" });
    }

    const contactEmail = student.contactInfo?.email;
    if (!contactEmail) {
      return res
        .status(400)
        .json({ message: "Contact request is missing an email address" });
    }

    const username = contactEmail.toLowerCase();

    const existingStudent = await Student.findOne({
      _id: { $ne: student._id },
      $or: [{ username }, { email: username }],
      status: { $ne: "inactive" },
    });

    if (existingStudent) {
      return res.status(400).json({
        message:
          "Another student already uses this email. Update or remove the existing account first.",
      });
    }

    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email: username }],
    });

    if (existingAdmin) {
      return res.status(400).json({
        message:
          "An administrator account already uses this email. Choose a different email before approving.",
      });
    }

    student.username = username;
    student.email = username;
    student.status = "registered";
    student.isFirstLogin = false;
    if (student.contactInfo) {
      student.contactInfo.approvedAt = new Date();
    }

    await student.save();

    const invite = await sendStudentInviteEmail({
      email: username,
      name: student.contactInfo?.name,
    });

    res.json({
      message: invite.emailSent
        ? "Contact approved and login instructions sent successfully."
        : "Contact approved, but the email could not be delivered automatically.",
      student: {
        id: student._id,
        username: student.username,
        email: student.email,
        contactInfo: student.contactInfo,
      },
      inviteSent: invite.emailSent,
      loginLink: invite.loginLink,
    });
  } catch (error) {
    console.error("Approve contact request error:", error);
    res.status(500).json({
      message:
        error.message || "Failed to approve contact request. Please try again.",
    });
  }
};

// activate student account (admin only)
exports.activateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const isPending = student.status === "pending";
    const isRegistered = student.status === "registered";

    if (!isPending && !isRegistered) {
      return res.status(400).json({ message: "Student cannot be activated" });
    }

    const contactEmail = student.contactInfo?.email?.trim()?.toLowerCase();
    if (!contactEmail) {
      return res.status(400).json({
        message:
          "Student is missing an email address. Update their contact information before activating.",
      });
    }

    student.username = contactEmail;
    student.email = contactEmail;
    student.status = "active";
    student.isFirstLogin = false;

    await ensureDefaultRequiredDocuments(student, { save: false });
    await student.save();

    try {
      const recipient = contactEmail;
      if (recipient) {
        const studentName = student.contactInfo?.name || "there";
        const dashboardUrl = `${getAppBaseUrl()}/student/dashboard`;
        await sendEmail({
          to: recipient,
          subject: "Your Immigration CRM portal is now active",
          html: `
            <div style="font-family: 'Inter', Arial, sans-serif; line-height: 1.7; color: #0f172a;">
              <h1 style="margin-bottom: 12px; color: #0f172a;">Welcome aboard, ${studentName}!</h1>
              <p style="margin: 0 0 16px 0;">
                Your profile has been reviewed and your Immigration CRM portal is officially active.
                You can now upload the required study permit documents, track your progress, and message your advisor.
              </p>
              <div style="border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; margin-bottom: 18px;">
                <p style="margin: 0 0 12px 0; font-weight: 600;">Please have these documents ready:</p>
                <ul style="margin: 0; padding-left: 18px;">
                  <li>Passport (bio-data page)</li>
                  <li>IELTS / language test result</li>
                  <li>Recent passport-sized photograph</li>
                </ul>
              </div>
              <a
                href="${dashboardUrl}"
                style="
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  padding: 12px 22px;
                  border-radius: 999px;
                  background: linear-gradient(135deg, #2563eb, #7c3aed);
                  color: #ffffff;
                  font-weight: 600;
                  text-decoration: none;
                  min-width: 240px;
                "
              >
                Access my dashboard
              </a>
              <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
                Need help? Reply to this email and your advisor will follow up shortly.
              </p>
            </div>
          `,
        });
      }
    } catch (emailError) {
      console.error("Failed to send activation email:", emailError);
    }

    res.json({
      message: "Student account activated successfully",
      student: {
        id: student._id,
        aiKey: student.aiKey,
        username: student.username,
        email: student.email,
        contactInfo: student.contactInfo,
      },
    });
  } catch (error) {
    console.error("Activate student error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Username already exists" });
    }
    res.status(500).json({ message: "Failed to activate student" });
  }
};

// single student
exports.getStudentByKey = async (req, res) => {
  const student = await Student.findOne({ aiKey: req.params.aiKey });
  if (!student) return res.status(404).json({ message: "Not found" });
  res.json(student);
};

// get student by ID (admin only)
exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } catch (error) {
    console.error("Get student error:", error);
    res.status(500).json({ message: "Failed to get student" });
  }
};

// update student (admin only)
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const student = await Student.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({
      message: "Student updated successfully",
      student,
    });
  } catch (error) {
    console.error("Update student error:", error);
    res.status(500).json({ message: "Failed to update student" });
  }
};

// delete student (admin only)
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findByIdAndDelete(id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(500).json({ message: "Failed to delete student" });
  }
};

const normalizePassportDateValue = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    const match = value.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) {
      const normalized = new Date(match[1]);
      if (!Number.isNaN(normalized.getTime())) {
        return normalized.toISOString().slice(0, 10);
      }
    }
  }
  return value;
};

const sanitizePassportDetails = (details = {}) => {
  if (!details || typeof details !== "object") {
    return {};
  }

  const cleaned = {};
  if (details.fullName) cleaned.fullName = details.fullName.trim();
  if (details.number) cleaned.number = details.number.trim();
  if (details.dateOfBirth)
    cleaned.dateOfBirth = normalizePassportDateValue(details.dateOfBirth);
  if (details.expiryDate)
    cleaned.expiryDate = normalizePassportDateValue(details.expiryDate);

  if (Object.keys(cleaned).length) {
    cleaned.source = "manual";
    cleaned.manuallyUpdated = true;
    cleaned.updatedAt = new Date();
  }

  return cleaned;
};

// update profile (student self-service)
exports.updateSelfProfile = async (req, res) => {
  try {
    const { profile = {}, contactInfo = {} } = req.body || {};

    const student = await Student.findById(req.userId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (student.status === "inactive") {
      return res.status(403).json({ message: "Account inactive" });
    }

    if (profile && typeof profile === "object") {
      const passportDetailsInput = profile.passportDetails;
      const cleanedPassport = sanitizePassportDetails(passportDetailsInput);
      if (cleanedPassport && Object.keys(cleanedPassport).length) {
        student.profile = student.profile || {};
        student.profile.passportDetails = {
          ...(student.profile.passportDetails || {}),
          ...cleanedPassport,
        };
      }

      const profileWithoutPassport = { ...profile };
      delete profileWithoutPassport.passportDetails;

      if (Object.keys(profileWithoutPassport).length) {
        student.profile = {
          ...(student.profile || {}),
          ...profileWithoutPassport,
        };
      }
    }

    if (contactInfo && typeof contactInfo === "object") {
      student.contactInfo = {
        ...(student.contactInfo || {}),
        ...contactInfo,
      };
    }

    const profileObj = student.profile || {};
    const languageScores = [
      profileObj.listeningScore,
      profileObj.readingScore,
      profileObj.writingScore,
      profileObj.speakingScore,
    ];

    if (languageScores.every((value) => Number.isFinite(Number(value)))) {
      const numericScores = languageScores.map((value) => Number(value));
      const average =
        numericScores.reduce((acc, value) => acc + value, 0) /
        numericScores.length;
      const rounded = Math.round(average * 2) / 2;
      student.profile = {
        ...profileObj,
        overallScore: rounded,
      };
    }

    await student.save();

    res.json({
      message: "Profile updated",
      student: student.toObject(),
    });
  } catch (error) {
    console.error("Update self profile error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

// create student (admin only)
exports.createStudent = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      message,
      status = "active",
      profile = {},
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = normalizedEmail;

    const existingStudent = await Student.findOne({
      $or: [
        { email: normalizedEmail },
        { username: normalizedUsername },
        { "contactInfo.email": normalizedEmail },
      ],
    });

    if (existingStudent) {
      return res.status(400).json({
        message: "A student with this email or username already exists",
      });
    }

    const existingAdmin = await Admin.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    if (existingAdmin) {
      return res.status(400).json({
        message: "An admin already uses this email or username",
      });
    }

    const student = new Student({
      aiKey: `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: ["active", "pending", "inactive", "registered"].includes(status)
        ? status
        : "registered",
      username: normalizedUsername,
      email: normalizedEmail,
      isFirstLogin: false,
      profile,
      contactInfo: {
        name,
        email: normalizedEmail,
        phone,
        message,
      },
    });

    await ensureDefaultRequiredDocuments(student, { save: false });
    await student.save();

    const invite = await sendStudentInviteEmail({
      email: normalizedEmail,
      name,
    });

    try {
      const adminRecipients = await getAdminNotificationEmails();
      if (adminRecipients.length) {
        await sendEmail({
          to: adminRecipients.join(", "),
          subject: "Student account created",
          html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
            <h2 style="color:#1d4ed8;margin-bottom:12px;">New student created</h2>
             <p style="margin:0 0 16px 0;">
              ${name} (${normalizedEmail}) has been added${
            invite.emailSent ? " and login instructions were delivered." : "."
          }
             </p>
          </div>
        `,
        });
      }
    } catch (notifyError) {
      console.error("Failed to send admin notification email:", notifyError);
    }

    res.status(201).json({
      message: invite.emailSent
        ? "Student created successfully and login instructions sent."
        : "Student created successfully, but the invitation email could not be delivered automatically.",
      student: {
        id: student._id,
        username: student.username,
        email: student.email,
        status: student.status,
      },
      inviteSent: invite.emailSent,
      loginLink: invite.loginLink,
    });
  } catch (error) {
    console.error("Create student error:", error);
    res.status(500).json({ message: "Failed to create student" });
  }
};

// list S3 files with pre-signed URLs
exports.getStudentFiles = async (req, res) => {
  try {
    const student = await Student.findOne({ aiKey: req.params.aiKey });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const ensurePlain = (doc) => (doc?.toObject ? doc.toObject() : doc || {});

    let storedDocuments = (student.documents || []).map(ensurePlain);

    // If our database metadata is empty, rebuild it directly from S3
    if (!storedDocuments.length) {
      try {
        const prefixesToCheck = [
          student.aiKey,
          student.username && student.username !== student.aiKey
            ? student.username
            : null,
        ].filter(Boolean);

        for (const prefix of prefixesToCheck) {
          const s3Objects = await listStudentFiles(prefix);
          if (Array.isArray(s3Objects) && s3Objects.length) {
            storedDocuments = s3Objects.map((objectItem) => {
              const key = objectItem.Key;
              const name = key.replace(`${prefix}/`, "") || path.basename(key);
              return {
                key,
                bucket: env.AWS_S3_BUCKET_NAME,
                name,
                mimeType: getMimeType(name),
                size: objectItem.Size || 0,
                uploadedAt: objectItem.LastModified || new Date(),
              };
            });

            await Student.updateOne(
              { aiKey: student.aiKey },
              { $set: { documents: storedDocuments } }
            );
          }
        }
      } catch (fallbackError) {
        console.error(
          `⚠️ Failed to rebuild document metadata from S3 for ${req.params.aiKey}:`,
          fallbackError.message
        );
      }
    }

    // Generate pre-signed URLs for all documents
    const documentsWithUrls = await Promise.all(
      storedDocuments.map(async (doc) => {
        try {
          const presignedUrl = await getPresignedUrl(doc.key, doc.name);
          return {
            ...doc,
            url: presignedUrl,
          };
        } catch (error) {
          console.error(`Error generating URL for ${doc.name}:`, error.message);
          return {
            ...doc,
            url: null,
          };
        }
      })
    );

    console.log(
      `📁 Fetching files for student ${req.params.aiKey}: ${documentsWithUrls.length} documents found`
    );

    res.json({
      files: documentsWithUrls,
      totalFiles: documentsWithUrls.length,
    });
  } catch (error) {
    console.error("Get student files error:", error);
    res.status(500).json({ error: "Failed to retrieve documents" });
  }
};

exports.renameStudentDocument = async (req, res) => {
  try {
    const { aiKey, documentId } = req.params;
    const { newName } = req.body;

    if (!newName || !newName.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "New document name is required" });
    }

    const student = await Student.findOne({ aiKey });
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    if (!canManageStudentDocuments(req.user, student)) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const document = student.documents.id(documentId);
    if (!document) {
      return res
        .status(404)
        .json({ success: false, message: "Document not found" });
    }

    const sanitizedName = newName
      .trim()
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, " ");

    const ext = path.extname(document.name || "");
    let finalName = sanitizedName;
    if (!ext && !path.extname(finalName)) {
      // no extension on original or new name
    } else if (!path.extname(finalName) && ext) {
      finalName += ext;
    }

    document.name = finalName;
    document.updatedAt = new Date();

    await student.save();

    const url = await getPresignedUrl(document.key, document.name);
    const docObj = document.toObject ? document.toObject() : document;

    res.json({
      success: true,
      message: "Document renamed successfully",
      document: { ...docObj, url },
    });
  } catch (error) {
    console.error("Rename document error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to rename document" });
  }
};

exports.deleteStudentDocument = async (req, res) => {
  try {
    const { aiKey, documentId } = req.params;
    const student = await Student.findOne({ aiKey });
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    const document =
      student.documents.id(documentId) ||
      student.documents.find((doc) => doc.key === documentId);

    if (!document)
      return res
        .status(404)
        .json({ success: false, message: "Document not found" });

    // Delete from S3
    if (document.key) {
      try {
        await deleteS3Object(document.key);
      } catch (s3Err) {
        console.error("⚠️ Failed to delete from S3:", s3Err.message);
      }
    }

    // Delete from MongoDB
    const beforeCount = student.documents.length;
    student.documents = student.documents.filter(
      (doc) =>
        doc._id.toString() !== document._id.toString() &&
        doc.key !== document.key
    );

    await student.save({ validateBeforeSave: false });
    const afterCount = student.documents.length;

    console.log(
      `🧹 Mongo cleanup: ${beforeCount - afterCount} document(s) removed`
    );

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully",
      documentId,
    });
  } catch (error) {
    console.error("❌ Delete document error stack:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete document",
      error: error.message,
      stack: error.stack,
    });
  }
};

// =====================
// REQUIRED DOCUMENTS
// =====================

const DEFAULT_REQUIRED_DOCUMENTS = [
  {
    name: "Passport",
    description: "Upload a clear scan of the bio-data page from your passport.",
  },
  {
    name: "Language Test Result (IELTS)",
    description:
      "Provide the most recent IELTS test report showing all band scores.",
  },
  {
    name: "Photograph",
    description:
      "Attach a recent passport-sized photograph that meets visa requirements.",
  },
  {
    name: "Proof of Funds",
    description:
      "Submit bank statements or financial documents demonstrating sufficient funds.",
  },
  {
    name: "Acceptance Letter",
    description:
      "Upload the official acceptance letter from your educational institution.",
  },
  {
    name: "Medical Examination Report",
    description:
      "Provide the medical examination report from an approved panel physician.",
  },
  {
    name: "Police Clearance Certificate",
    description:
      "Attach a police clearance certificate from your country of residence.",
  },
  {
    name: "Previous Visa Copies",
    description: "Upload copies of any previous visas you have held.",
  },
  {
    name: "Educational Transcripts",
    description:
      "Provide transcripts from your previous educational institutions.",
  },
];

const sanitizeForSlug = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "document";

const createDocumentSlug = (name = "") => {
  const base = sanitizeForSlug(name);
  const unique = Date.now().toString(36);
  return `${base}-${unique}`;
};

const VERIFICATION_STATUSES = new Set(["pending", "verified", "failed"]);

const normalizeFileVerification = (file = {}) => {
  const verification = file.verification || {};
  const rawStatus =
    typeof verification.status === "string"
      ? verification.status.toLowerCase()
      : "";
  const status = VERIFICATION_STATUSES.has(rawStatus) ? rawStatus : "pending";
  return {
    status,
    confidence:
      typeof verification.confidence === "number"
        ? verification.confidence
        : null,
    detectedType: verification.detectedType || "",
    reason: verification.reason || "",
    checkedAt:
      verification.checkedAt ||
      verification.lastCheckedAt ||
      file.uploadedAt ||
      null,
  };
};

const mapFileForResponse = (file) => {
  if (!file) return null;
  const plain = file.toObject ? file.toObject() : file;
  return {
    id: plain._id,
    name: plain.name,
    bucket: plain.bucket,
    size: plain.size,
    mimeType: plain.mimeType,
    uploadedAt: plain.uploadedAt,
    uploadedBy: plain.uploadedBy,
    uploadedByRole: plain.uploadedByRole,
    key: plain.key,
    verificationTaskId: plain.verificationTaskId || null,
    verification: normalizeFileVerification(plain),
  };
};

const buildDocumentVerificationSummary = (plainDoc = {}, files = []) => {
  const summary = {
    status: plainDoc.verification?.status || "pending",
    confidence:
      typeof plainDoc.verification?.confidence === "number"
        ? plainDoc.verification.confidence
        : null,
    detectedType: plainDoc.verification?.detectedType || "",
    reason:
      plainDoc.verification?.reason ||
      (files.length ? "Awaiting AI confirmation." : "No files uploaded yet."),
    lastCheckedAt:
      plainDoc.verification?.lastCheckedAt ||
      plainDoc.updatedAt ||
      plainDoc.createdAt ||
      null,
  };

  if (!files.length) {
    summary.status = "pending";
    return summary;
  }

  const statuses = files.map((file) => file.verification.status);
  if (statuses.includes("verified")) {
    summary.status = "verified";
  } else if (statuses.includes("failed")) {
    summary.status = "failed";
  } else {
    summary.status = statuses[statuses.length - 1] || "pending";
  }

  const sorted = [...files].sort((a, b) => {
    const dateA = new Date(
      a.verification.checkedAt || a.uploadedAt || 0
    ).getTime();
    const dateB = new Date(
      b.verification.checkedAt || b.uploadedAt || 0
    ).getTime();
    return dateB - dateA;
  });

  const latest = sorted[0];
  summary.lastCheckedAt =
    latest?.verification?.checkedAt ||
    plainDoc.verification?.lastCheckedAt ||
    new Date();
  summary.confidence =
    latest?.verification?.confidence ??
    plainDoc.verification?.confidence ??
    null;
  summary.detectedType =
    latest?.verification?.detectedType ||
    plainDoc.verification?.detectedType ||
    "";
  summary.reason =
    latest?.verification?.reason ||
    plainDoc.verification?.reason ||
    (summary.status === "verified"
      ? "AI verified the latest upload."
      : "Manual verification required.");

  return summary;
};

const refreshDocumentVerificationSnapshot = (document) => {
  if (!document) return;
  const files = Array.isArray(document.files)
    ? document.files.map((file) => mapFileForResponse(file)).filter(Boolean)
    : [];
  const summary = buildDocumentVerificationSummary(document, files);
  document.verification = {
    status: summary.status,
    confidence: summary.confidence,
    detectedType: summary.detectedType,
    reason: summary.reason,
    lastCheckedAt: summary.lastCheckedAt || new Date(),
  };
  document.isUploaded = files.length > 0;
};

const createDefaultRequiredDocument = (name, description = "") => ({
  name: name.trim(),
  description: description?.toString()?.trim() || "",
  slug: createDocumentSlug(name),
  aiExtractionEnabled: true,
  files: [],
  isUploaded: false,
  verification: {
    status: "pending",
    reason: "Document not uploaded yet",
    lastCheckedAt: new Date(),
  },
  createdAt: new Date(),
  updatedAt: new Date(),
});

const ensureDefaultRequiredDocuments = async (
  student,
  { save = true } = {}
) => {
  if (!student) return false;
  if (!Array.isArray(student.requiredDocuments)) {
    student.requiredDocuments = [];
  }

  const existingKeys = new Set(
    student.requiredDocuments.map((doc) =>
      sanitizeForSlug(doc?.name || doc?.slug || "")
    )
  );

  let added = false;
  DEFAULT_REQUIRED_DOCUMENTS.forEach(({ name, description }) => {
    const key = sanitizeForSlug(name);
    if (!existingKeys.has(key)) {
      student.requiredDocuments.push(
        createDefaultRequiredDocument(name, description)
      );
      existingKeys.add(key);
      added = true;
    }
  });

  if (added && save) {
    student.markModified("requiredDocuments");
    await student.save();
  }

  return added;
};

const formatRequiredDocument = (doc) => {
  if (!doc) return null;
  const plain = doc.toObject ? doc.toObject() : doc;
  const slug = plain.slug || createDocumentSlug(plain.name || "document");
  const files = Array.isArray(plain.files)
    ? plain.files.map((file) => mapFileForResponse(file)).filter(Boolean)
    : [];
  const verification = buildDocumentVerificationSummary(plain, files);
  return {
    id: plain._id,
    name: plain.name,
    description: plain.description || "",
    slug,
    aiExtractionEnabled: Boolean(plain.aiExtractionEnabled),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    isUploaded: plain.isUploaded || (plain.files && plain.files.length > 0),
    filesCount: Array.isArray(plain.files) ? plain.files.length : 0,
    verification,
    verificationStatus: verification.status,
    files,
  };
};

const respondWithRequiredDocs = (res, student) => {
  const docs = Array.isArray(student.requiredDocuments)
    ? student.requiredDocuments.map(formatRequiredDocument)
    : [];
  return res.json({ success: true, requiredDocuments: docs });
};

const notifyStudentAboutRequiredDoc = async (student, document) => {
  try {
    const recipient = student.email || student.contactInfo?.email;
    if (!recipient) {
      return;
    }

    await sendEmail({
      to: recipient,
      subject: `New required document: ${document.name}`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; color: #0f172a; line-height: 1.6;">
          <h2 style="margin-bottom: 12px; color: #1d4ed8;">New document requested</h2>
          <p style="margin: 0 0 16px 0;">
            Your advisor just requested <strong>${document.name}</strong>.
          </p>
          <p style="margin: 0 0 16px 0;">Please sign in to the client portal to upload the file securely.</p>
          <a href="${env.APP_BASE_URL}/login" style="display: inline-block; padding: 12px 20px; background: #2563eb; color: #ffffff; border-radius: 8px; font-weight: 600; text-decoration: none;">Open portal</a>
          <p style="margin-top: 24px; font-size: 13px; color: #64748b;">If you believe this message was sent in error, contact your advisor.</p>
        </div>
      `,
    });
  } catch (notificationError) {
    console.error(
      "Failed to send required document notification:",
      notificationError
    );
  }
};

// Add a required document
exports.addRequiredDocument = async (req, res) => {
  try {
    const { aiKey } = req.params;
    const { name, description, aiExtractionEnabled } = req.body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Document name required" });
    }

    const student = await Student.findOne({ aiKey });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const newDoc = {
      name: name.trim(),
      description: description?.toString()?.trim() || "",
      slug: createDocumentSlug(name),
      aiExtractionEnabled:
        typeof aiExtractionEnabled === "boolean" ? aiExtractionEnabled : true,
      files: [],
      isUploaded: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docs = Array.isArray(student.requiredDocuments)
      ? student.requiredDocuments
      : [];

    student.requiredDocuments = [newDoc, ...docs];
    student.markModified("requiredDocuments");
    await student.save();

    const formattedDocs = student.requiredDocuments.map(formatRequiredDocument);

    notifyStudentAboutRequiredDoc(student, newDoc).catch((err) =>
      console.error("Required doc notification error:", err)
    );

    return res.json({ success: true, requiredDocuments: formattedDocs });
  } catch (error) {
    console.error("Add required doc error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to add required document" });
  }
};

// Get all required documents
exports.getRequiredDocuments = async (req, res) => {
  try {
    const { aiKey } = req.params;
    const student = await Student.findOne({ aiKey });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const isAdmin = req.user?.role === "admin";
    const isOwner = req.user?.role === "student" && req.user?.aiKey === aiKey;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    await ensureDefaultRequiredDocuments(student);
    return respondWithRequiredDocs(res, student);
  } catch (error) {
    console.error("Get required docs error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch required documents" });
  }
};

// Delete a required document
exports.deleteRequiredDocument = async (req, res) => {
  try {
    const { aiKey, docId } = req.params;
    const student = await Student.findOne({ aiKey });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const isAdmin = req.user?.role === "admin";
    const isOwner = req.user?.role === "student" && req.user?.aiKey === aiKey;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    const doc = student.requiredDocuments.id(docId);
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (Array.isArray(doc.files)) {
      for (const file of doc.files) {
        if (file?.key) {
          try {
            await deleteS3Object(file.key);
          } catch (s3Error) {
            console.error(
              "Failed to delete S3 object for required doc:",
              s3Error.message
            );
          }
        }
      }
    }

    await resolveVerificationTasks({
      documentId: doc._id,
      status: "failed",
      reason: "Document requirement removed.",
    });

    student.requiredDocuments.pull({ _id: docId });
    student.markModified("requiredDocuments");
    await student.save();

    return respondWithRequiredDocs(res, student);
  } catch (error) {
    console.error("Delete required doc error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete required document" });
  }
};

exports.updateRequiredDocumentSettings = async (req, res) => {
  try {
    const { aiKey, docId } = req.params;
    const { name, description, aiExtractionEnabled } = req.body || {};

    const student = await Student.findOne({ aiKey });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const document = student.requiredDocuments.id(docId);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (typeof name === "string" && name.trim()) {
      document.name = name.trim();
    }

    if (typeof description === "string") {
      document.description = description.trim();
    } else if (description === null) {
      document.description = "";
    }

    if (typeof aiExtractionEnabled === "boolean") {
      document.aiExtractionEnabled = aiExtractionEnabled;
    }

    document.updatedAt = new Date();
    student.markModified("requiredDocuments");
    await student.save();

    return res.json({
      success: true,
      document: formatRequiredDocument(document),
    });
  } catch (error) {
    console.error("Update required doc settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update required document settings",
    });
  }
};

// Shared helper: Process file upload to required document
// This function contains the core upload logic used by both manual and AI upload routes
const processRequiredDocumentUpload = async ({
  student,
  document,
  file,
  uploadOptions = {},
}) => {
  const {
    ownerType = "student",
    fileSource = "manual",
    uploadedBy = null,
    uploadedByRole = "student",
    skipVerification = false,
    skipExtraction = false,
  } = uploadOptions;

  const studentDisplayName = getStudentDisplayName(student);
  const extension = guessExtension(file.originalname, file.mimetype);
  const renamedFileName = buildRequiredDocFileName({
    fieldName: document.name || "Document",
    studentName: studentDisplayName,
    extension,
  });

  // AI Extraction (if enabled and not skipped)
  let extractedProfile = null;
  if (!skipExtraction && document.aiExtractionEnabled) {
    try {
      extractedProfile = await extractProfileWithAI([file]);
    } catch (extractionError) {
      console.error("AI extraction failed:", extractionError);
    }
  }

  // Document Verification (if not skipped)
  let verificationResult = {
    status: "pending",
    confidence: 0,
    detectedType: "",
    reason: skipVerification ? "Verification skipped" : "Verification skipped",
    checkedAt: new Date(),
  };

  if (!skipVerification) {
    try {
      verificationResult = await verifyDocumentType({
        expectedType: document.name,
        filePath: file.path,
        mimeType: file.mimetype,
      });
    } catch (verificationError) {
      console.error("AI document verification failed:", verificationError);
    }
  }

  // Upload to S3
  const s3Prefix = `${
    student.aiKey || student.username || "student"
  }/required/${document.slug}`;
  const uploadResult = await uploadFileToS3(
    file.path,
    renamedFileName,
    s3Prefix
  );

  // Create metadata
  const metadata = {
    key: uploadResult.key,
    bucket: uploadResult.bucket,
    name: renamedFileName,
    size: file.size,
    mimeType: file.mimetype,
    uploadedAt: new Date(),
    uploadedBy,
    uploadedByRole,
    verification: {
      status: verificationResult.status,
      confidence: verificationResult.confidence,
      detectedType: verificationResult.detectedType,
      reason: verificationResult.reason,
      checkedAt: verificationResult.checkedAt || new Date(),
    },
  };

  // Create comprehensive File record
  try {
    await File.create({
      aiKey: student.aiKey,
      studentId: student._id,
      studentName: studentDisplayName,
      ownerType,
      field: document.name || "Document",
      fieldSlug: document.slug,
      requiredDocumentId: document._id,
      originalName: file.originalname,
      storedName: renamedFileName,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      s3Key: uploadResult.key,
      bucket: uploadResult.bucket,
      storageLocation: "S3",
      source: fileSource,
      status: "UPLOADED",
    });
  } catch (fileError) {
    console.error("Failed to create File record:", fileError);
    // Continue - don't block the main flow
  }

  // Add file to document
  document.files = Array.isArray(document.files) ? document.files : [];
  document.files.push(metadata);
  const savedFile = document.files[document.files.length - 1];

  // Handle verification tasks (only if verification was performed)
  if (!skipVerification) {
    if (verificationResult.status === "verified") {
      await resolveVerificationTasks({
        documentId: document._id,
        status: "verified",
      });
    } else {
      const verificationTask = await createVerificationTask({
        student,
        document,
        fileMeta: savedFile,
        verification: verificationResult,
      });
      if (verificationTask?._id) {
        savedFile.verificationTaskId = verificationTask._id;
      }
    }
  }

  // Update document status
  document.isUploaded = true;
  if (document.status === "missing" || document.status === "pending") {
    document.status = "uploaded";
  }
  document.updatedAt = new Date();
  refreshDocumentVerificationSnapshot(document);

  // Update student profile with extracted data (if any)
  if (extractedProfile && Object.keys(extractedProfile).length) {
    try {
      const prioritized = prioritizeFields(extractedProfile);
      if (Object.keys(prioritized).length) {
        await upsertStudent({
          aiKey: student.aiKey,
          profile: prioritized,
        });
      }
    } catch (saveError) {
      console.error("Failed to persist AI extraction:", saveError);
    }
  }

  return {
    metadata,
    uploadResult,
    savedFile,
    extractedProfile,
    verificationResult,
  };
};

// Unified upload route: accepts either docId (URL param) or documentType (body param)
exports.uploadRequiredDocumentFile = async (req, res) => {
  try {
    const { aiKey, docId } = req.params;
    const { documentType } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "File is required" });
    }

    // Determine if this is an AI/system upload (no user, or documentType provided)
    const isAISystemUpload = !req.user || (documentType && !docId);
    const uploadSource = isAISystemUpload ? "ai" : "manual";

    logDocumentWorkflow(`${uploadSource}-upload:received`, {
      aiKey,
      docId: docId || null,
      documentType: documentType || null,
      actorRole: req.user?.role || "ai_assistant",
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    // Auth checks only for manual uploads (not AI/system)
    if (!isAISystemUpload) {
      const isAdmin = req.user?.role === "admin";
      const isOwner = req.user?.role === "student" && req.user?.aiKey === aiKey;

      if (!isAdmin && !isOwner) {
        deleteLocalFile(file.path);
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const student = await Student.findOne({ aiKey });
    if (!student) {
      deleteLocalFile(file.path);
      return res.status(404).json({ message: "Student not found" });
    }
    logDocumentWorkflow(`${uploadSource}-upload:student-loaded`, {
      aiKey,
      docId: docId || null,
      studentId: student._id,
      studentName: getStudentDisplayName(student),
    });

    // Find document by docId OR documentType
    let document;
    if (docId) {
      // Standard flow: document must exist
      document = student.requiredDocuments.id(docId);
      if (!document) {
        deleteLocalFile(file.path);
        return res.status(404).json({ message: "Document not found" });
      }
    } else if (documentType) {
      // AI/system flow: find or create by name
      const normalizedDocumentType =
        typeof documentType === "string" ? documentType.trim() : "";
      if (!normalizedDocumentType) {
        deleteLocalFile(file.path);
        return res.status(400).json({ message: "Document type is required" });
      }

      document = student.requiredDocuments.find(
        (doc) => doc.name.toLowerCase() === normalizedDocumentType.toLowerCase()
      );

      // If not found, create it
      if (!document) {
        const slug = createDocumentSlug(normalizedDocumentType);
        student.requiredDocuments.push({
          name: normalizedDocumentType,
          slug,
          isRequired: true,
          status: "pending",
          files: [],
        });
        await student.save();
        document =
          student.requiredDocuments[student.requiredDocuments.length - 1];
        console.log(
          `Upload: Created new required document '${normalizedDocumentType}' for ${aiKey}`
        );
        logDocumentWorkflow(`${uploadSource}-upload:document-created`, {
          aiKey,
          documentType: normalizedDocumentType,
          slug,
          docId: document?._id,
        });
      }
    } else {
      deleteLocalFile(file.path);
      return res
        .status(400)
        .json({ message: "Either docId or documentType is required" });
    }

    if (!document.slug) {
      document.slug = createDocumentSlug(document.name || "document");
    }
    logDocumentWorkflow(`${uploadSource}-upload:document-resolved`, {
      aiKey,
      docId: document._id,
      documentName: document.name,
      slug: document.slug,
    });

    // Determine upload metadata based on source
    const actorRole = req.user?.role || "ai_assistant";
    const ownerType = isAISystemUpload
      ? "ai_assistant"
      : actorRole === "admin"
      ? "admin"
      : actorRole === "student"
      ? "student"
      : "system";
    const fileSource = isAISystemUpload
      ? "ai"
      : actorRole === "admin"
      ? "admin"
      : actorRole === "student"
      ? "manual"
      : "system";

    const studentDisplayName = getStudentDisplayName(student);
    const extension = guessExtension(file.originalname, file.mimetype);
    const renamedFileName = buildRequiredDocFileName({
      fieldName: document.name || "Document",
      studentName: studentDisplayName,
      extension,
    });

    logRequiredDocUpload({
      aiKey,
      docId: document._id,
      documentName: document.name || "Document",
      studentName: studentDisplayName,
      originalName: file.originalname,
      newName: renamedFileName,
      userRole: actorRole,
      userId: req.user?.id || req.user?._id || null,
    });

    // Use shared upload logic - ALWAYS do verification
    const { metadata, uploadResult, savedFile } =
      await processRequiredDocumentUpload({
        student,
        document,
        file,
        uploadOptions: {
          ownerType,
          fileSource,
          uploadedBy: req.user?.id || req.user?._id || null,
          uploadedByRole: actorRole,
          skipVerification: false, // Always do verification
          skipExtraction: false, // Do extraction if enabled
        },
      });

    logDocumentWorkflow(`${uploadSource}-upload:s3-uploaded`, {
      aiKey,
      docId: document._id,
      key: uploadResult.key,
      bucket: uploadResult.bucket,
      storedName: metadata.name,
    });

    logDocumentWorkflow(`${uploadSource}-upload:student-document-updated`, {
      aiKey,
      docId: document._id,
      fileId: savedFile?._id,
      fileKey: uploadResult.key,
    });

    student.markModified("requiredDocuments");
    await student.save();
    logDocumentWorkflow(`${uploadSource}-upload:student-saved`, {
      aiKey,
      docId: document._id,
      studentId: student._id,
      fileKey: uploadResult.key,
    });

    if (file.path) {
      deleteLocalFile(file.path);
    }

    const formatted = formatRequiredDocument(document);
    logDocumentWorkflow(`${uploadSource}-upload:success`, {
      aiKey,
      docId: document._id,
      fileKey: uploadResult.key,
      field: document.name,
    });
    res.json({ success: true, document: formatted });
  } catch (error) {
    console.error("Upload required doc file error:", error);
    logDocumentWorkflow("upload:error", {
      error: error.message,
      stack: error.stack,
    });
    if (req.file?.path) {
      deleteLocalFile(req.file.path);
    }
    res
      .status(500)
      .json({ success: false, message: "Failed to upload document" });
  }
};

exports.listRequiredDocumentFiles = async (req, res) => {
  try {
    const { aiKey, docId } = req.params;
    const student = await Student.findOne({ aiKey });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const isAdmin = req.user?.role === "admin";
    const isOwner = req.user?.role === "student" && req.user?.aiKey === aiKey;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    const document = student.requiredDocuments.id(docId);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const formatted = formatRequiredDocument(document);
    res.json({ success: true, document: formatted, files: formatted.files });
  } catch (error) {
    console.error("List required doc files error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to list document files" });
  }
};

exports.getRequiredDocumentFileUrl = async (req, res) => {
  try {
    const { aiKey, docId, fileId } = req.params;
    const student = await Student.findOne({ aiKey });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const isAdmin = req.user?.role === "admin";
    const isOwner = req.user?.role === "student" && req.user?.aiKey === aiKey;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    const document = student.requiredDocuments.id(docId);
    if (!document)
      return res.status(404).json({ message: "Document not found" });

    const file = (document.files || []).id(fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    const url = await getPresignedUrl(file.key, file.name);
    res.json({ success: true, url });
  } catch (error) {
    console.error("Get required doc file url error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to generate file link" });
  }
};

exports.deleteRequiredDocumentFile = async (req, res) => {
  try {
    const { aiKey, docId, fileId } = req.params;
    const student = await Student.findOne({ aiKey });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const isAdmin = req.user?.role === "admin";
    const isOwner = req.user?.role === "student" && req.user?.aiKey === aiKey;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    const document = student.requiredDocuments.id(docId);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const file = (document.files || []).id(fileId);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    if (file.key) {
      try {
        await deleteS3Object(file.key);
      } catch (s3Error) {
        console.error("Failed to delete S3 object:", s3Error.message);
      }
    }

    await resolveVerificationTasks({
      documentId: document._id,
      fileId,
      status: "failed",
      reason: "Source file deleted.",
    });

    document.files.pull({ _id: fileId });
    if (!document.files.length) {
      document.isUploaded = false;
    }
    document.updatedAt = new Date();
    refreshDocumentVerificationSnapshot(document);
    student.markModified("requiredDocuments");
    await student.save();

    res.json({
      success: true,
      document: formatRequiredDocument(document),
    });
  } catch (error) {
    console.error("Delete required doc file error:", error);
    res.status(500).json({ success: false, message: "Failed to delete file" });
  }
};

exports.listStudentTasks = async (req, res) => {
  try {
    const { aiKey } = req.params;
    const { markSeen } = req.query;
    const student = await Student.findOne({ aiKey });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const isAdmin = req.user?.role === "admin";
    const isOwner = req.user?.role === "student" && req.user?.aiKey === aiKey;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    await purgeOldCompletedTasks(student);

    const tasks = Array.isArray(student.tasks)
      ? [...student.tasks].sort(
          (a, b) =>
            new Date(b.assignedAt || b.createdAt || 0) -
            new Date(a.assignedAt || a.createdAt || 0)
        )
      : [];

    if (isOwner && markSeen === "true") {
      let updated = false;
      tasks.forEach((task) => {
        if (!task.seenByStudent) {
          task.seenByStudent = true;
          updated = true;
        }
      });
      if (updated) {
        student.markModified("tasks");
        await student.save();
      }
    }

    res.json({
      success: true,
      tasks: tasks.map((task) => formatStudentTask(task)),
    });
  } catch (error) {
    console.error("List student tasks error:", error);
    res.status(500).json({ success: false, message: "Failed to load tasks" });
  }
};

exports.createStudentTask = async (req, res) => {
  try {
    const { aiKey } = req.params;
    const { title, description, dueDate } = req.body || {};
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Task title is required" });
    }

    const student = await Student.findOne({ aiKey });
    if (!student) return res.status(404).json({ message: "Student not found" });

    let parsedDueDate = null;
    if (dueDate) {
      const candidate = new Date(dueDate);
      if (Number.isNaN(candidate.getTime())) {
        return res.status(400).json({ message: "Invalid due date" });
      }
      parsedDueDate = candidate;
    }

    let attachment = null;
    if (req.file) {
      try {
        const safeName = `${Date.now()}-${req.file.originalname.replace(
          /\s+/g,
          "_"
        )}`;
        const prefix = `${
          student.aiKey || student.username || "student"
        }/tasks`;
        const uploadResult = await uploadFileToS3(
          req.file.path,
          safeName,
          prefix
        );
        attachment = {
          key: uploadResult.key,
          bucket: uploadResult.bucket,
          name: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
        };
      } finally {
        if (req.file?.path) {
          deleteLocalFile(req.file.path);
        }
      }
    }

    const newTask = {
      title: title.trim(),
      description: description?.toString()?.trim() || "",
      dueDate: parsedDueDate,
      status: "pending",
      attachment,
      assignedBy: req.user?._id || req.user?.id || null,
      assignedAt: new Date(),
      seenByStudent: false,
    };

    student.tasks = Array.isArray(student.tasks) ? student.tasks : [];
    student.tasks.unshift(newTask);
    student.markModified("tasks");
    await student.save();
    await purgeOldCompletedTasks(student);

    await sendTaskAssignedEmail({
      student,
      task: newTask,
    });

    res.json({
      success: true,
      tasks: student.tasks.map((task) => formatStudentTask(task)),
    });
  } catch (error) {
    console.error("Create student task error:", error);
    res.status(500).json({ success: false, message: "Failed to create task" });
  }
};

exports.updateStudentTask = async (req, res) => {
  try {
    const { aiKey, taskId } = req.params;
    const { status, seenByStudent } = req.body || {};
    const student = await Student.findOne({ aiKey });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const task = (student.tasks || []).id(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const isAdmin = req.user?.role === "admin";
    const isOwner = req.user?.role === "student" && req.user?.aiKey === aiKey;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    let statusUpdatedToCompleted = false;
    if (status && TASK_STATUSES.includes(status)) {
      const previousStatus = task.status;
      task.status = status;
      if (status === "completed") {
        task.completedAt = new Date();
        statusUpdatedToCompleted = previousStatus !== "completed";
      } else {
        task.completedAt = null;
      }
    }

    if (typeof seenByStudent === "boolean" && isOwner) {
      task.seenByStudent = seenByStudent;
    }

    student.markModified("tasks");
    await student.save();

    if (
      statusUpdatedToCompleted &&
      req.userRole === "student" &&
      task.assignedBy
    ) {
      try {
        const notification = await Notification.create({
          recipientUserId: task.assignedBy,
          recipientRole: "admin",
          actorUserId: req.userId,
          actorName: getStudentDisplayName(student),
          taskId: task._id,
          taskTitle: task.title,
          taskSummary: task.description?.slice(0, 160) || "",
          type: "TASK_COMPLETED",
          status: "UNREAD",
          meta: {
            studentAiKey: student.aiKey,
            studentId: student._id,
            dueDate: task.dueDate,
          },
        });
        emitNotification(notification.toObject());
      } catch (notifyError) {
        console.error(
          "Failed to create task completion notification:",
          notifyError
        );
      }
    }

    res.json({
      success: true,
      tasks: student.tasks.map((item) => formatStudentTask(item)),
    });
  } catch (error) {
    console.error("Update student task error:", error);
    res.status(500).json({ success: false, message: "Failed to update task" });
  }
};

exports.getStudentTaskAttachmentUrl = async (req, res) => {
  try {
    const { aiKey, taskId } = req.params;
    const student = await Student.findOne({ aiKey });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const task = (student.tasks || []).id(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const isAdmin = req.user?.role === "admin";
    const isOwner = req.user?.role === "student" && req.user?.aiKey === aiKey;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!task.attachment?.key || !task.attachment?.name) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    const url = await getPresignedUrl(
      task.attachment.key,
      task.attachment.name
    );
    res.json({ success: true, url });
  } catch (error) {
    console.error("Get task attachment url error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to generate attachment link" });
  }
};

exports.deleteStudentTask = async (req, res) => {
  try {
    const { aiKey, taskId } = req.params;
    const student = await Student.findOne({ aiKey });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const task = (student.tasks || []).id(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const isAdmin = req.user?.role === "admin";
    const isOwner = req.user?.role === "student" && req.user?.aiKey === aiKey;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (task.attachment?.key) {
      try {
        await deleteS3Object(task.attachment.key);
      } catch (err) {
        console.error("Failed to delete task attachment:", err.message);
      }
    }

    task.deleteOne();
    student.markModified("tasks");
    await student.save();

    res.json({
      success: true,
      tasks: student.tasks.map((item) => formatStudentTask(item)),
    });
  } catch (error) {
    console.error("Delete student task error:", error);
    res.status(500).json({ success: false, message: "Failed to delete task" });
  }
};

exports.verifyRequiredDocumentFile = async (req, res) => {
  try {
    const { aiKey, docId, fileId } = req.params;
    const student = await Student.findOne({ aiKey });
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const document = student.requiredDocuments.id(docId);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const file = (document.files || []).id(fileId);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    file.verification = {
      status: "verified",
      confidence: 1,
      detectedType:
        file.verification?.detectedType || document.name || "Document",
      reason: "Verified by admin",
      checkedAt: new Date(),
    };

    document.isUploaded = true;
    document.updatedAt = new Date();
    refreshDocumentVerificationSnapshot(document);
    student.markModified("requiredDocuments");
    await student.save();

    await resolveVerificationTasks({
      documentId: document._id,
      fileId: file._id,
      status: "verified",
      resolvedBy: req.user?._id || req.user?.id || null,
      reason: "Verified by admin",
    });

    res.json({
      success: true,
      document: formatRequiredDocument(document),
    });
  } catch (error) {
    console.error("Verify required doc file error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to verify document" });
  }
};
