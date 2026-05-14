const { describe, it, expect, jest, beforeEach } = require("@jest/globals");

jest.mock("../services/email.service");
jest.mock("../config/logger");

const emailService = require("../services/email.service");
const emailTools = require("../tools/emailTools");

describe("Email Tools", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Schema shape ───────────────────────────────────────────────────────────
  describe("tool structure", () => {
    it("exports sendEmail with description, args, and run()", () => {
      expect(emailTools.sendEmail).toHaveProperty("description");
      expect(emailTools.sendEmail).toHaveProperty("args");
      expect(typeof emailTools.sendEmail.run).toBe("function");
    });

    it("args is a valid JSON-schema object", () => {
      const { args } = emailTools.sendEmail;
      expect(args.type).toBe("object");
      expect(args.properties).toBeDefined();
    });

    it("requires to, subject, and body; html is optional", () => {
      const { required, properties } = emailTools.sendEmail.args;
      expect(required).toContain("to");
      expect(required).toContain("subject");
      expect(required).toContain("body");
      expect(required).not.toContain("html");
      expect(properties).toHaveProperty("html");
    });
  });

  // ── sendEmail ──────────────────────────────────────────────────────────────
  describe("sendEmail", () => {
    it("sends a plain-text email and returns success output", async () => {
      emailService.sendEmail.mockResolvedValue({ messageId: "msg-001", response: "OK" });

      const result = await emailTools.sendEmail.run({
        to: "john@example.com",
        subject: "Your documents",
        body: "Please upload your passport.",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg-001");
      expect(result.summary).toContain("john@example.com");
      expect(result.notification.type).toBe("success");
      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: "john@example.com",
        subject: "Your documents",
        text: "Please upload your passport.",
        html: undefined,
      });
    });

    it("includes html when provided", async () => {
      emailService.sendEmail.mockResolvedValue({ messageId: "msg-002" });

      await emailTools.sendEmail.run({
        to: "jane@example.com",
        subject: "Welcome",
        body: "Hello",
        html: "<p>Hello</p>",
      });

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ html: "<p>Hello</p>" })
      );
    });

    it("trims whitespace from the recipient", async () => {
      emailService.sendEmail.mockResolvedValue({ messageId: "msg-003" });

      const result = await emailTools.sendEmail.run({
        to: "  trim@example.com  ",
        subject: "Test",
        body: "Body",
      });

      expect(result.summary).toContain("trim@example.com");
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: "trim@example.com" })
      );
    });

    it("rejects when recipient is empty or whitespace-only", async () => {
      await expect(
        emailTools.sendEmail.run({ to: "   ", subject: "S", body: "B" })
      ).rejects.toThrow("Recipient email is required.");
    });

    it("surfaces service errors", async () => {
      emailService.sendEmail.mockRejectedValue(new Error("SMTP connection refused"));

      await expect(
        emailTools.sendEmail.run({
          to: "fail@example.com",
          subject: "Fail",
          body: "This should fail",
        })
      ).rejects.toThrow("SMTP connection refused");
    });
  });
});
