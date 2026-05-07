const jwt = require("jsonwebtoken");
const Admin = require("../../models/Admin");
const Student = require("../../models/Student");
const { generateAiKey } = require("../../utils/generateAiKey");
const { getAdminNotificationEmails } = require("../../utils/adminRecipients");
const { sendEmail } = require("../../utils/sendEmail");
const { getFirebaseAdmin } = require("../../utils/firebaseAdmin");
const { sendStudentInviteEmail } = require("../students/student.invite");
const env = require("../../config/env");

const getAppBaseUrl = () =>
  (env?.APP_BASE_URL || process.env.APP_BASE_URL || "https://portal.example.com").replace(/\/$/, "");

console.log("🔧 AUTH CONTROLLER LOADED");

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      username: user.username,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || "7d" }
  );
};

// Login for both admin and student
exports.login = async (req, res) => {
  console.log("🚀 LOGIN FUNCTION CALLED");
  try {
    const { username, password } = req.body;
    console.log("🔐 Login attempt:", { username, hasPassword: !!password });

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password required" });
    }

    // Try admin accounts first
    console.log("🔍 Searching for admin with username:", username);
    const admin = await Admin.findOne({
      $or: [{ username }, { email: username }],
    });
    console.log("🔍 Admin search result:", admin ? "Found" : "Not found");
    if (admin) {
      console.log("🔍 Found admin:", {
        username: admin.username,
        email: admin.email,
        role: admin.role,
      });

      const isPasswordValid = await admin.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = generateToken(admin);

      return res.json({
        message: "Login successful",
        token,
        user: {
          id: admin._id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
          status: admin.status,
        },
      });
    }

    // If an admin account was not found, check if the user is a student
    const student = await Student.findOne({
      $or: [{ username }, { email: username }],
      status: { $in: ["active", "registered"] },
    });
    console.log("🔍 Student search result:", student ? "Found" : "Not found");

    if (student) {
      return res.status(403).json({
        message:
          "Students must sign in using the email link or Google option on the login page.",
      });
    }

    console.log("❌ No matching user for credentials");
    return res.status(401).json({ message: "Invalid credentials" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
};

// Firebase-based login (passwordless)
exports.firebaseLogin = async (req, res) => {
  try {
    const firebaseAdmin = getFirebaseAdmin();
    if (!firebaseAdmin) {
      return res
        .status(500)
        .json({ message: "Firebase authentication is not configured." });
    }

    const { idToken } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ message: "Firebase idToken is required." });
    }

    const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    const email = decoded.email?.toLowerCase();
    if (!email) {
      return res
        .status(400)
        .json({ message: "Firebase user is missing an email address." });
    }

    if (decoded.email_verified === false) {
      return res.status(403).json({
        message: "Please verify your email with the provider before signing in.",
      });
    }

    const displayName =
      decoded.name ||
      decoded.displayName ||
      `${decoded.given_name || ""} ${decoded.family_name || ""}`.trim() ||
      email.split("@")[0];

    // Block login if an admin uses this flow
    const existingAdmin = await Admin.findOne({
      $or: [{ email }, { username: email }],
    });
    if (existingAdmin) {
      return res.status(403).json({
        message: "Admin accounts must sign in with username and password.",
      });
    }

    let student = await Student.findOne({
      $or: [{ email }, { username: email }],
    });

    if (!student) {
      let baseKey = generateAiKey(displayName || email);
      let aiKey = baseKey;
      let attempt = 0;

      while (await Student.findOne({ aiKey })) {
        attempt += 1;
        aiKey = `${baseKey}_${attempt}`;
      }

      student = new Student({
        aiKey,
        email,
        username: email,
        role: "student",
        status: "registered",
        isFirstLogin: false,
        contactInfo: {
          name: displayName,
          email,
          phone: "",
          message: "",
        },
        profile: {
          fullName: displayName,
          email,
        },
      });

      await student.save();
    } else {
      if (student.status === "inactive") {
        return res.status(403).json({
          message:
            "Your account is inactive. Please contact support to regain access.",
        });
      }

      let needsSave = false;

      if (!student.email) {
        student.email = email;
        needsSave = true;
      }

      if (!student.username) {
        student.username = email;
        needsSave = true;
      }

      if (!student.status) {
        student.status = "registered";
        needsSave = true;
      }

      if (student.isFirstLogin) {
        student.isFirstLogin = false;
        needsSave = true;
      }

      const existingName =
        student.contactInfo?.name ||
        student.profile?.fullName ||
        student.profile?.name;

      if (!existingName && displayName) {
        student.contactInfo = {
          ...(student.contactInfo || {}),
          name: displayName,
          email,
        };
        student.profile = {
          ...(student.profile || {}),
          fullName: displayName,
          email,
        };
        needsSave = true;
      } else if (!student.contactInfo?.email) {
        student.contactInfo = {
          ...(student.contactInfo || {}),
          email,
        };
        needsSave = true;
      }

      if (needsSave) {
        await student.save();
      }
    }

    const token = generateToken(student);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: student._id,
        username: student.username,
        email: student.email,
        role: student.role,
        aiKey: student.aiKey,
        isFirstLogin: student.isFirstLogin,
        status: student.status,
      },
    });
  } catch (error) {
    console.error("Firebase login error:", error);

    if (error.code === "auth/invalid-id-token") {
      return res.status(401).json({ message: "Invalid Firebase token." });
    }

    res.status(500).json({ message: "Firebase login failed." });
  }
};

exports.sendLoginLink = async (req, res) => {
  try {
    const emailRaw = req.body?.email;
    if (!emailRaw || typeof emailRaw !== "string") {
      return res.status(400).json({ message: "Email address is required." });
    }

    const email = emailRaw.trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Email address is required." });
    }

    const student = await Student.findOne({
      $or: [{ email }, { username: email }, { "contactInfo.email": email }],
    });

    if (!student) {
      return res.status(404).json({
        message:
          "We couldn't find a student account with that email. Please contact your advisor or register for access.",
      });
    }

    if (student.status === "inactive") {
      return res.status(403).json({
        message:
          "This account is inactive. Contact your advisor to restore access.",
      });
    }

    const name =
      student.contactInfo?.name ||
      student.profile?.fullName ||
      student.profile?.name ||
      "";

    const invite = await sendStudentInviteEmail({
      email,
      name,
    });

    return res.json({
      message: invite.emailSent
        ? "Check your inbox for a secure login link."
        : "We generated a login link, but email delivery failed. Ask your advisor to resend the invite.",
      inviteSent: invite.emailSent,
      loginLink: invite.loginLink,
    });
  } catch (error) {
    console.error("Send login link error:", error);
    return res
      .status(500)
      .json({ message: "Unable to send the login link right now." });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    if (user.role !== "admin") {
      return res.status(403).json({
        message: "Student accounts use passwordless authentication. Request a sign-in link from the login page instead.",
      });
    }

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current and new password required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    user.isFirstLogin = false; // Mark as no longer first login
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
};

// Register student (self-service)
exports.registerStudent = async (req, res) => {
  try {
    const { name, email, phone } = req.body || {};

    if (!name || !email) {
      return res
        .status(400)
        .json({ message: "Name and email are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingStudent = await Student.findOne({
      $or: [
        { email: normalizedEmail },
        { username: normalizedEmail },
        { "contactInfo.email": normalizedEmail },
      ],
    });

    if (existingStudent) {
      return res
        .status(400)
        .json({ message: "An account with this email already exists." });
    }

    const existingAdmin = await Admin.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedEmail }],
    });

    if (existingAdmin) {
      return res
        .status(400)
        .json({ message: "An administrator already uses this email." });
    }

    let aiKeyBase = generateAiKey(name);
    let aiKey = aiKeyBase;
    let collisionCount = 0;

    while (await Student.findOne({ aiKey })) {
      collisionCount += 1;
      aiKey = `${aiKeyBase}_${collisionCount}`;
    }

    const student = new Student({
      aiKey,
      username: normalizedEmail,
      email: normalizedEmail,
      role: "student",
      status: "registered",
      isFirstLogin: false,
      contactInfo: {
        name,
        email: normalizedEmail,
        phone: phone?.trim() || "",
      },
      profile: {
        fullName: name,
        email: normalizedEmail,
        phone: phone?.trim() || "",
      },
    });

    await student.save();

    try {
      const adminRecipients = await getAdminNotificationEmails();
      if (adminRecipients.length) {
        const profileUrl = `${getAppBaseUrl()}/admin/students/${student._id}`;
        await sendEmail({
          to: adminRecipients.join(", "),
          subject: "New student registration received",
          html: `
            <div style="font-family: 'Inter', Arial, sans-serif; line-height: 1.65; color: #0f172a;">
              <h2 style="margin: 0 0 12px 0; color: #1d4ed8;">New student awaiting onboarding</h2>
              <p style="margin: 0 0 16px 0;">A new student just completed the registration flow and is ready for review.</p>
              <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; width: 140px;">Name</td>
                    <td style="padding: 6px 0;">${name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600;">Email</td>
                    <td style="padding: 6px 0;">${normalizedEmail}</td>
                  </tr>
                  ${
                    phone
                      ? `<tr>
                    <td style="padding: 6px 0; font-weight: 600;">Phone</td>
                    <td style="padding: 6px 0;">${phone}</td>
                  </tr>`
                      : ""
                  }
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600;">AI Key</td>
                    <td style="padding: 6px 0;">${aiKey}</td>
                  </tr>
                </table>
              </div>
              <a
                href="${profileUrl}"
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
                  min-width: 220px;
                  text-align: center;
                "
              >
                Review student profile
              </a>
              <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
                Tip: Activate the student to unlock their dashboard and populate their required document checklist automatically.
              </p>
            </div>
          `,
        });
      }
    } catch (notifyError) {
      console.error("Failed to send registration notification:", notifyError);
    }

    const invite = await sendStudentInviteEmail({
      email: normalizedEmail,
      name,
    });

    res.status(201).json({
      message: invite.emailSent
        ? "Registration successful. Check your email for the login link."
        : "Registration received, but we could not deliver the login email automatically.",
      inviteSent: invite.emailSent,
      loginLink: invite.loginLink,
    });
  } catch (error) {
    console.error("Student registration error:", error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Email or username already in use." });
    }
    res.status(500).json({ message: "Failed to register student." });
  }
};

// Register first admin (one-time setup)
exports.registerAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    // Check if any admin already exists
    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const admin = new Admin({
      username,
      email,
      password,
    });

    await admin.save();

    const token = generateToken(admin);

    res.status(201).json({
      message: "Admin created successfully",
      token,
      user: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin registration error:", error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Username or email already exists" });
    }
    res.status(500).json({ message: "Failed to create admin" });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const user = req.user;
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      aiKey: user.aiKey, // for students
      isFirstLogin: user.isFirstLogin, // for students
      profile: user.profile, // for students
      contactInfo: user.contactInfo, // for students
      status: user.status,
      preferences: user.preferences || {},
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Failed to get profile" });
  }
};
