const { describe, it, expect, jest, beforeEach } = require("@jest/globals");

jest.mock("../services/student.service");
jest.mock("../config/logger");

const studentService = require("../services/student.service");
const taskTools = require("../tools/taskTools");

const STUDENT_ID = "student-xyz-456";
const TASK_ID = "task-001";

describe("Task Tools", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Schema shape ───────────────────────────────────────────────────────────
  describe("tool structure", () => {
    const names = [
      "getTasksForStudent",
      "createStudentTask",
      "updateStudentTaskStatus",
      "deleteStudentTask",
    ];

    it.each(names)("%s has description, args, and run()", (name) => {
      expect(taskTools[name]).toHaveProperty("description");
      expect(taskTools[name]).toHaveProperty("args");
      expect(typeof taskTools[name].run).toBe("function");
    });
  });

  // ── getTasksForStudent ─────────────────────────────────────────────────────
  describe("getTasksForStudent", () => {
    it("returns tasks list from service", async () => {
      const mockTasks = { tasks: [{ id: TASK_ID, title: "Upload passport" }] };
      studentService.getStudentTasks.mockResolvedValue(mockTasks);

      const result = await taskTools.getTasksForStudent.run({ studentId: STUDENT_ID });

      expect(result).toEqual(mockTasks);
      expect(studentService.getStudentTasks).toHaveBeenCalledWith(STUDENT_ID);
    });

    it("requires studentId in schema", () => {
      expect(taskTools.getTasksForStudent.args.required).toContain("studentId");
    });
  });

  // ── createStudentTask ──────────────────────────────────────────────────────
  describe("createStudentTask", () => {
    it("creates a task with required fields only", async () => {
      const mockCreated = { id: TASK_ID, title: "Upload IELTS", status: "pending" };
      studentService.createStudentTask.mockResolvedValue(mockCreated);

      const result = await taskTools.createStudentTask.run({
        studentId: STUDENT_ID,
        title: "Upload IELTS",
      });

      expect(result).toEqual(mockCreated);
      expect(studentService.createStudentTask).toHaveBeenCalledWith(STUDENT_ID, {
        title: "Upload IELTS",
        description: undefined,
        dueDate: undefined,
        attachmentPath: undefined,
      });
    });

    it("creates a task with all optional fields", async () => {
      studentService.createStudentTask.mockResolvedValue({ id: TASK_ID });

      await taskTools.createStudentTask.run({
        studentId: STUDENT_ID,
        title: "Submit SOP",
        description: "Write statement of purpose",
        dueDate: "2026-06-01",
        attachmentPath: "/tmp/sop.pdf",
      });

      expect(studentService.createStudentTask).toHaveBeenCalledWith(STUDENT_ID, {
        title: "Submit SOP",
        description: "Write statement of purpose",
        dueDate: "2026-06-01",
        attachmentPath: "/tmp/sop.pdf",
      });
    });

    it("requires studentId and title in schema", () => {
      const { required } = taskTools.createStudentTask.args;
      expect(required).toContain("studentId");
      expect(required).toContain("title");
    });

    it("optional fields are not required in schema", () => {
      const { required = [] } = taskTools.createStudentTask.args;
      expect(required).not.toContain("description");
      expect(required).not.toContain("dueDate");
      expect(required).not.toContain("attachmentPath");
    });
  });

  // ── updateStudentTaskStatus ────────────────────────────────────────────────
  describe("updateStudentTaskStatus", () => {
    it("updates status without notes", async () => {
      const mockResult = { id: TASK_ID, status: "completed" };
      studentService.updateStudentTask.mockResolvedValue(mockResult);

      const result = await taskTools.updateStudentTaskStatus.run({
        studentId: STUDENT_ID,
        taskId: TASK_ID,
        status: "completed",
      });

      expect(result).toEqual(mockResult);
      expect(studentService.updateStudentTask).toHaveBeenCalledWith(
        STUDENT_ID,
        TASK_ID,
        { status: "completed", notes: undefined }
      );
    });

    it("includes notes when provided", async () => {
      studentService.updateStudentTask.mockResolvedValue({ id: TASK_ID });

      await taskTools.updateStudentTaskStatus.run({
        studentId: STUDENT_ID,
        taskId: TASK_ID,
        status: "completed",
        notes: "Student uploaded the document",
      });

      expect(studentService.updateStudentTask).toHaveBeenCalledWith(
        STUDENT_ID,
        TASK_ID,
        { status: "completed", notes: "Student uploaded the document" }
      );
    });

    it("requires studentId, taskId, and status in schema", () => {
      const { required } = taskTools.updateStudentTaskStatus.args;
      expect(required).toContain("studentId");
      expect(required).toContain("taskId");
      expect(required).toContain("status");
    });
  });

  // ── deleteStudentTask ──────────────────────────────────────────────────────
  describe("deleteStudentTask", () => {
    it("calls service with studentId and taskId", async () => {
      const mockResult = { success: true };
      studentService.deleteStudentTask.mockResolvedValue(mockResult);

      const result = await taskTools.deleteStudentTask.run({
        studentId: STUDENT_ID,
        taskId: TASK_ID,
      });

      expect(result).toEqual(mockResult);
      expect(studentService.deleteStudentTask).toHaveBeenCalledWith(STUDENT_ID, TASK_ID);
    });

    it("requires studentId and taskId in schema", () => {
      const { required } = taskTools.deleteStudentTask.args;
      expect(required).toContain("studentId");
      expect(required).toContain("taskId");
    });
  });

  // ── Error propagation ──────────────────────────────────────────────────────
  describe("error propagation", () => {
    it("surfaces service errors", async () => {
      studentService.getStudentTasks.mockRejectedValue(new Error("Unauthorized"));

      await expect(
        taskTools.getTasksForStudent.run({ studentId: STUDENT_ID })
      ).rejects.toThrow("Unauthorized");
    });
  });
});
