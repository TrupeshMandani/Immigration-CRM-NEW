const { sendEmail } = require("../services/email.service");

module.exports = {
  sendEmail: {
    description:
      "Send an email to a recipient. Provide the recipient email, subject, and message body.",
    args: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Recipient email address (e.g., trupesh@example.com)",
        },
        subject: {
          type: "string",
          description: "Subject line for the email.",
        },
        body: {
          type: "string",
          description:
            "Plain text body of the email describing why you are reaching out.",
        },
        html: {
          type: "string",
          description: "Optional HTML body for the email.",
        },
      },
      required: ["to", "subject", "body"],
    },
    run: async ({ to, subject, body, html }) => {
      const trimmedTo = (to || "").trim();
      if (!trimmedTo) {
        throw new Error("Recipient email is required.");
      }

      const result = await sendEmail({
        to: trimmedTo,
        subject: subject?.trim(),
        text: body?.trim(),
        html: html?.trim(),
      });

      return {
        success: true,
        summary: `Email sent to ${trimmedTo}`,
        messageId: result.messageId,
        notification: {
          type: "success",
          message: `Email sent successfully to ${trimmedTo}`,
        },
      };
    },
  },
};
