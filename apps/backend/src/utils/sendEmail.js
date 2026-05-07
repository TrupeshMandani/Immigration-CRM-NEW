const nodemailer = require("nodemailer");
const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASSWORD,
  EMAIL_FROM,
} = require("../config/env");

let transporter;

const ensureTransporter = () => {
  if (transporter) {
    return transporter;
  }

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    throw new Error(
      "Email transport is not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD."
    );
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });

  return transporter;
};

exports.sendEmail = async ({ to, subject, html }) => {
  const activeTransporter = ensureTransporter();

  await activeTransporter.sendMail({
    from: EMAIL_FROM || SMTP_USER,
    to,
    subject,
    html,
  });
};
