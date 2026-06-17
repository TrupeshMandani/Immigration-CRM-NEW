const { describe, it, expect, jest, beforeEach } = require("@jest/globals");

jest.mock("../services/applicant.service");
jest.mock("../config/logger");

const applicantService = require("../services/applicant.service");
const taskTools = require("../tools/taskTools");

const APPLICANT_ID = "applicant-xyz-456";
const TASK_ID = "task-001";

describe("Task Tools", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Schema shape ───────────────────────────────────────────────────────────
  describe("tool structure", () => {
    const names = [
      "getTasksForApplicant",
      "createApplicantTask",
      "updateApplicantTaskStatus",
      "deleteApplicantTask",
    ];

    it.each(names)("%s has description, args, and run()", (name) => {
      expect(taskTools[name]).toHaveProperty("description");
      expect(taskTools[name]).toHaveProperty("args");
      expect(typeof taskTools[name].run).toBe("function");
    });
  });

  // ── getTasksForApplicant ───────────────────────────────────────────────────
  describe("getTasksForApplicant", () => {
    it("returns tasks list from service", async () => {
      const mockTasks = { tasks: [{ id: TASK_ID, title: "Upload passport" }] };
      applicantService.getApplicantTasks.mockResolvedValue(mockTasks);

      const result = await taskTools.getTasksForApplicant.run({ applicantId: APPLICANT_ID });

      expect(result).toEqual(mockTasks);
      expect(applicantService.getApplicantTasks).toHaveBeenCalledWith(APPLICANT_ID);
    });

    it("requires applicantId in schema", () => {
      expect(taskTools.getTasksForApplicant.args.required).toContain("applicantId");
    });
  });

  // ── createApplicantTask ────────────────────────────────────────────────────
  describe("createApplicantTask", () => {
    it("creates a task with required fields only", async () => {
      const mockCreated = { id: TASK_ID, title: "Upload IELTS", status: "pending" };
      applicantService.createApplicantTask.mockResolvedValue(mockCreated);

      const result = await taskTools.createApplicantTask.run({
        applicantId: APPLICANT_ID,
        title: "Upload IELTS",
      });

      expect(result).toEqual(mockCreated);
      expect(applicantService.createApplicantTask).toHaveBeenCalledWith(APPLICANT_ID, {
        title: "Upload IELTS",
        description: undefined,
        dueDate: undefined,
        attachmentPath: undefined,
      });
    });

    it("creates a task with all optional fields", async () => {
      applicantService.createApplicantTask.mockResolvedValue({ id: TASK_ID });

      await taskTools.createApplicantTask.run({
        applicantId: APPLICANT_ID,
        title: "Submit SOP",
        description: "Write statement of purpose",
        dueDate: "2026-06-01",
        attachmentPath: "/tmp/sop.pdf",
      });

      expect(applicantService.createApplicantTask).toHaveBeenCalledWith(APPLICANT_ID, {
        title: "Submit SOP",
        description: "Write statement of purpose",
        dueDate: "2026-06-01",
        attachmentPath: "/tmp/sop.pdf",
      });
    });

    it("requires applicantId and title in schema", () => {
      const { required } = taskTools.createApplicantTask.args;
      expect(required).toContain("applicantId");
      expect(required).toContain("title");
    });

    it("optional fields are not required in schema", () => {
      const { required = [] } = taskTools.createApplicantTask.args;
      expect(required).not.toContain("description");
      expect(required).not.toContain("dueDate");
      expect(required).not.toContain("attachmentPath");
    });
  });

  // ── updateApplicantTaskStatus ──────────────────────────────────────────────
  describe("updateApplicantTaskStatus", () => {
    it("updates status without notes", async () => {
      const mockResult = { id: TASK_ID, status: "completed" };
      applicantService.updateApplicantTask.mockResolvedValue(mockResult);

      const result = await taskTools.updateApplicantTaskStatus.run({
        applicantId: APPLICANT_ID,
        taskId: TASK_ID,
        status: "completed",
      });

      expect(result).toEqual(mockResult);
      expect(applicantService.updateApplicantTask).toHaveBeenCalledWith(
        APPLICANT_ID,
        TASK_ID,
        { status: "completed", notes: undefined }
      );
    });

    it("includes notes when provided", async () => {
      applicantService.updateApplicantTask.mockResolvedValue({ id: TASK_ID });

      await taskTools.updateApplicantTaskStatus.run({
        applicantId: APPLICANT_ID,
        taskId: TASK_ID,
        status: "completed",
        notes: "Applicant uploaded the document",
      });

      expect(applicantService.updateApplicantTask).toHaveBeenCalledWith(
        APPLICANT_ID,
        TASK_ID,
        { status: "completed", notes: "Applicant uploaded the document" }
      );
    });

    it("requires applicantId, taskId, and status in schema", () => {
      const { required } = taskTools.updateApplicantTaskStatus.args;
      expect(required).toContain("applicantId");
      expect(required).toContain("taskId");
      expect(required).toContain("status");
    });
  });

  // ── deleteApplicantTask ────────────────────────────────────────────────────
  describe("deleteApplicantTask", () => {
    it("calls service with applicantId and taskId", async () => {
      const mockResult = { success: true };
      applicantService.deleteApplicantTask.mockResolvedValue(mockResult);

      const result = await taskTools.deleteApplicantTask.run({
        applicantId: APPLICANT_ID,
        taskId: TASK_ID,
      });

      expect(result).toEqual(mockResult);
      expect(applicantService.deleteApplicantTask).toHaveBeenCalledWith(APPLICANT_ID, TASK_ID);
    });

    it("requires applicantId and taskId in schema", () => {
      const { required } = taskTools.deleteApplicantTask.args;
      expect(required).toContain("applicantId");
      expect(required).toContain("taskId");
    });
  });

  // ── Error propagation ──────────────────────────────────────────────────────
  describe("error propagation", () => {
    it("surfaces service errors", async () => {
      applicantService.getApplicantTasks.mockRejectedValue(new Error("Unauthorized"));

      await expect(
        taskTools.getTasksForApplicant.run({ applicantId: APPLICANT_ID })
      ).rejects.toThrow("Unauthorized");
    });
  });
});
