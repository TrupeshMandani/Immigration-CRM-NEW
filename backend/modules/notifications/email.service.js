const nodemailer = require("nodemailer");

// Email templates
const emailTemplates = {
  newMessage: {
    subject: "New Message - Immigration CRM",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">New Message Received</h2>
        <p>Dear ${data.studentName},</p>
        <p>You have received a new message from your immigration team:</p>
        <div style="background-color: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p><strong>From:</strong> ${data.senderName}</p>
          <p><strong>Message:</strong> ${data.message}</p>
        </div>
        <p>Please log in to your dashboard to view and respond to this message.</p>
        <a href="${data.loginUrl}" style="background-color: #1d4ed8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Messages</a>
        <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
          This is an automated message from Immigration CRM. Please do not reply to this email.
        </p>
      </div>
    `,
  },

  documentUploaded: {
    subject: "Document Uploaded - Immigration CRM",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">Document Uploaded Successfully</h2>
        <p>Dear ${data.studentName},</p>
        <p>Your document has been uploaded successfully:</p>
        <div style="background-color: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p><strong>Document Type:</strong> ${data.documentType}</p>
          <p><strong>Category:</strong> ${data.category}</p>
          <p><strong>Upload Date:</strong> ${data.uploadDate}</p>
        </div>
        <p>Our team will review your document and notify you of the status.</p>
        <a href="${data.dashboardUrl}" style="background-color: #1d4ed8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Dashboard</a>
        <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
          This is an automated message from Immigration CRM. Please do not reply to this email.
        </p>
      </div>
    `,
  },

  documentVerified: {
    subject: "Document Verified - Immigration CRM",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">Document Verified</h2>
        <p>Dear ${data.studentName},</p>
        <p>Great news! Your document has been verified:</p>
        <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p><strong>Document Type:</strong> ${data.documentType}</p>
          <p><strong>Category:</strong> ${data.category}</p>
          <p><strong>Verified By:</strong> ${data.verifiedBy}</p>
          <p><strong>Verified Date:</strong> ${data.verifiedDate}</p>
        </div>
        <p>Your document is now part of your application file.</p>
        <a href="${data.dashboardUrl}" style="background-color: #1d4ed8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Dashboard</a>
        <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
          This is an automated message from Immigration CRM. Please do not reply to this email.
        </p>
      </div>
    `,
  },

  documentRejected: {
    subject: "Document Rejected - Immigration CRM",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Document Rejected</h2>
        <p>Dear ${data.studentName},</p>
        <p>Unfortunately, your document has been rejected and needs to be resubmitted:</p>
        <div style="background-color: #fef2f2; border: 1px solid #dc2626; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p><strong>Document Type:</strong> ${data.documentType}</p>
          <p><strong>Category:</strong> ${data.category}</p>
          <p><strong>Reviewed By:</strong> ${data.reviewedBy}</p>
          <p><strong>Rejection Reason:</strong> ${data.rejectionReason}</p>
        </div>
        <p>Please review the feedback and upload a corrected version of the document.</p>
        <a href="${data.uploadUrl}" style="background-color: #1d4ed8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Upload Document</a>
        <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
          This is an automated message from Immigration CRM. Please do not reply to this email.
        </p>
      </div>
    `,
  },

  applicationStatusUpdate: {
    subject: "Application Status Update - Immigration CRM",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">Application Status Update</h2>
        <p>Dear ${data.studentName},</p>
        <p>Your application status has been updated:</p>
        <div style="background-color: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p><strong>Application:</strong> ${data.applicationNumber}</p>
          <p><strong>Previous Status:</strong> ${data.previousStatus}</p>
          <p><strong>New Status:</strong> ${data.newStatus}</p>
          <p><strong>Updated:</strong> ${data.updateDate}</p>
        </div>
        ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ""}
        <p>You can view your application details and next steps in your dashboard.</p>
        <a href="${
          data.dashboardUrl
        }" style="background-color: #1d4ed8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Application</a>
        <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
          This is an automated message from Immigration CRM. Please do not reply to this email.
        </p>
      </div>
    `,
  },

  documentExpiring: {
    subject: "Document Expiring Soon - Immigration CRM",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">Document Expiring Soon</h2>
        <p>Dear ${data.studentName},</p>
        <p>We wanted to remind you that one of your documents is expiring soon:</p>
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p><strong>Document:</strong> ${data.documentType}</p>
          <p><strong>Expiry Date:</strong> ${data.expiryDate}</p>
          <p><strong>Days Remaining:</strong> ${data.daysRemaining} days</p>
        </div>
        <p>Please ensure you renew this document before it expires to avoid any delays in your application process.</p>
        <a href="${data.dashboardUrl}" style="background-color: #1d4ed8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Documents</a>
        <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
          This is an automated message from Immigration CRM. Please do not reply to this email.
        </p>
      </div>
    `,
  },

  newRequiredDocument: {
    subject: "New Document Required - Immigration CRM",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">New Document Required</h2>
        <p>Dear ${data.studentName},</p>
        <p>We need you to upload the following document to continue processing your application:</p>
        <div style="background-color: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p><strong>Document Type:</strong> ${data.documentType}</p>
          <p><strong>Category:</strong> ${data.category}</p>
          <p><strong>Priority:</strong> ${data.priority}</p>
          <p><strong>Due Date:</strong> ${data.dueDate}</p>
          ${
            data.description
              ? `<p><strong>Description:</strong> ${data.description}</p>`
              : ""
          }
        </div>
        <p>Please log in to your dashboard and upload this document as soon as possible.</p>
        <a href="${
          data.uploadUrl
        }" style="background-color: #1d4ed8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Upload Document</a>
        <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
          This is an automated message from Immigration CRM. Please do not reply to this email.
        </p>
      </div>
    `,
  },
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Send email notification
exports.sendEmailNotification = async (templateName, recipientEmail, data) => {
  try {
    const template = emailTemplates[templateName];
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Immigration CRM" <${process.env.SMTP_USER}>`,
      to: recipientEmail,
      subject: template.subject,
      html: template.html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully: ${result.messageId}`);

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
};

// Send bulk email notifications
exports.sendBulkEmailNotifications = async (notifications) => {
  const results = [];

  for (const notification of notifications) {
    const result = await exports.sendEmailNotification(
      notification.templateName,
      notification.recipientEmail,
      notification.data
    );
    results.push({ ...notification, result });
  }

  return results;
};

// Test email configuration
exports.testEmailConfiguration = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return { success: true, message: "Email configuration is valid" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
