const { sendEmail } = require("../../utils/sendEmail");
const { getFirebaseAdmin } = require("../../utils/firebaseAdmin");
const env = require("../../config/env");

const { APP_BASE_URL } = env;
const { FIREBASE_DYNAMIC_LINK_DOMAIN } = process.env;

const buildInviteEmail = ({ name, loginLink }) => {
  const greeting = name ? `Hi ${name.split(" ")[0]},` : "Hello,";
  const safeLoginLink = loginLink || `${APP_BASE_URL}/login`;

  return `
  <div style="background:#f4f6fb;padding:32px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="92%" style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;background:#ffffff;border-radius:18px;box-shadow:0 18px 35px -20px rgba(30,64,175,0.45);overflow:hidden;">
      <tr>
        <td style="background:linear-gradient(135deg,#0f4c81 0%,#2563eb 100%);padding:28px 32px;">
          <h1 style="margin:0;font-size:26px;line-height:1.25;color:#ffffff;font-weight:700;">Immigration CRM Student Portal</h1>
          <p style="margin:12px 0 0;font-size:15px;color:rgba(255,255,255,0.85);">Your personalised workspace for documents, recommendations, and updates.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;">
          <p style="margin:0 0 18px;font-size:16px;">${greeting}</p>
          <p style="margin:0 0 18px;font-size:16px;line-height:1.65;">
            You now have secure access to your Immigration CRM student hub. Click the button below to verify your email and open your dashboard. The link is protected and expires shortly for your security.
          </p>
          <div style="text-align:center;margin:30px 0;">
            <a href="${safeLoginLink}" style="display:inline-block;padding:14px 28px;background:#2563eb;border-radius:999px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;letter-spacing:0.6px;box-shadow:0 12px 28px -16px rgba(37,99,235,0.9);">
              Launch Student Portal
            </a>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin-bottom:24px;">
            <p style="margin:0 0 10px;font-size:15px;font-weight:600;color:#0f172a;">What to expect inside</p>
            <ul style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:1.6;">
              <li><strong>Profile overview:</strong> confirm your personal and academic details.</li>
              <li><strong>University recommendations:</strong> review AI-curated matches tailored to you.</li>
              <li><strong>Document centre:</strong> upload or view required files shared by your advisor.</li>
            </ul>
          </div>
          <p style="margin:0 0 12px;font-size:15px;">
            Having trouble with the button? Copy and paste this link into your browser:
          </p>
          <p style="margin:0 0 24px;font-size:13px;color:#1d4ed8;word-break:break-word;">
            <a href="${safeLoginLink}" style="color:#1d4ed8;text-decoration:none;">${safeLoginLink}</a>
          </p>
          <p style="margin:0 0 8px;font-size:14px;color:#475569;">
            Tip: You can always request a fresh link from
            <a href="${APP_BASE_URL}/login" style="color:#2563eb;font-weight:600;text-decoration:none;">${APP_BASE_URL}/login</a>
            by choosing <strong>“Continue with email”</strong>.
          </p>
          <p style="margin:32px 0 0;font-size:15px;color:#0f172a;font-weight:600;">Warm regards,<br/>The Immigration CRM Team</p>
        </td>
      </tr>
      <tr>
        <td style="background:#0f172a;padding:18px 24px;text-align:center;color:#e2e8f0;font-size:12px;letter-spacing:0.3px;">
          &copy; ${new Date().getFullYear()} Immigration CRM. All rights reserved.
        </td>
      </tr>
    </table>
  </div>
`;
};

const sendStudentInviteEmail = async ({ email, name }) => {
  if (!email) {
    return { emailSent: false, loginLink: null };
  }

  const firebaseAdmin = getFirebaseAdmin();
  const actionCodeSettings = {
    url: `${APP_BASE_URL}/login`,
    handleCodeInApp: true,
  };

  if (FIREBASE_DYNAMIC_LINK_DOMAIN) {
    actionCodeSettings.dynamicLinkDomain = FIREBASE_DYNAMIC_LINK_DOMAIN;
  }

  let loginLink = `${APP_BASE_URL}/login`;

  if (firebaseAdmin) {
    try {
      loginLink = await firebaseAdmin
        .auth()
        .generateSignInWithEmailLink(email, actionCodeSettings);
    } catch (error) {
      console.error("Failed to generate Firebase sign-in link:", error);
    }
  } else {
    console.warn("Firebase admin not configured. Falling back to manual link email.");
  }

  try {
    await sendEmail({
      to: email,
      subject: "Access your Immigration CRM portal",
      html: buildInviteEmail({ name, loginLink }),
    });
    return { emailSent: true, loginLink };
  } catch (error) {
    console.error("Failed to send student invite email:", error);
    return { emailSent: false, loginLink, error };
  }
};

module.exports = {
  sendStudentInviteEmail,
};
