const nodemailer = require("nodemailer");
const { getEnv } = require("../config/env");
const logger = require("../config/logger");

let transporter;

const smtpConfig = {
  host: getEnv("SMTP_HOST"),
  port: Number(getEnv("SMTP_PORT", 587)),
  user: getEnv("SMTP_USER"),
  pass: getEnv("SMTP_PASSWORD"),
  from: getEnv("EMAIL_FROM"),
};

const ensureTransporter = () => {
  if (transporter) {
    return transporter;
  }

  if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
    throw new Error(
      "SMTP credentials are missing. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD."
    );
  }

  transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.port === 465,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
  });

  return transporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  if (!to || !subject || (!text && !html)) {
    throw new Error("Email requires 'to', 'subject', and 'text' or 'html'.");
  }

  const mailOptions = {
    from: smtpConfig.from || smtpConfig.user,
    to,
    subject,
    text: text || undefined,
    html: html || undefined,
  };

  const activeTransporter = ensureTransporter();
  const info = await activeTransporter.sendMail(mailOptions);

  logger.info({
    scope: "email-service",
    event: "sent",
    to,
    messageId: info.messageId,
  });

  return {
    messageId: info.messageId,
    response: info.response,
  };
};

module.exports = {
  sendEmail,
};
