const { describe, it, expect, jest, beforeEach } = require("@jest/globals");

jest.mock("../services/student.service");
jest.mock("../config/logger");

const studentService = require("../services/student.service");
const studentTools = require("../tools/studentTools");

const STUDENT_ID = "student-abc-123";

describe("Student Tools", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Schema shape ───────────────────────────────────────────────────────────
  describe("tool structure", () => {
    const names = [
      "getStudentById",
      "searchStudents",
      "getStudentMissingDocuments",
      "updateStudentStage",
      "addStudentNote",
      "getStudentOverview",
    ];

    it.each(names)("%s has description, args, and run()", (name) => {
      expect(studentTools[name]).toHaveProperty("description");
      expect(studentTools[name]).toHaveProperty("args");
      expect(typeof studentTools[name].run).toBe("function");
    });

    it.each(names)("%s args is a valid JSON-schema object", (name) => {
      const { args } = studentTools[name];
      expect(args.type).toBe("object");
      expect(args.properties).toBeDefined();
    });
  });

  // ── getStudentById ─────────────────────────────────────────────────────────
  describe("getStudentById", () => {
    it("returns student data from the service", async () => {
      const mockStudent = { id: STUDENT_ID, first_name: "John", last_name: "Doe" };
      studentService.getStudentById.mockResolvedValue(mockStudent);

      const result = await studentTools.getStudentById.run({ studentId: STUDENT_ID });

      expect(result).toEqual(mockStudent);
      expect(studentService.getStudentById).toHaveBeenCalledWith(STUDENT_ID);
    });

    it("has studentId as required in args schema", () => {
      expect(studentTools.getStudentById.args.required).toContain("studentId");
    });
  });

  // ── searchStudents ─────────────────────────────────────────────────────────
  describe("searchStudents", () => {
    it("passes query to the service", async () => {
      const mockList = { students: [{ id: "1" }, { id: "2" }] };
      studentService.searchStudents.mockResolvedValue(mockList);

      const result = await studentTools.searchStudents.run({ query: "John" });

      expect(result).toEqual(mockList);
      expect(studentService.searchStudents).toHaveBeenCalledWith("John");
    });

    it("works without a query (list all)", async () => {
      studentService.searchStudents.mockResolvedValue({ students: [] });

      await studentTools.searchStudents.run({});

      expect(studentService.searchStudents).toHaveBeenCalledWith(undefined);
    });

    it("query is not required in args schema", () => {
      expect(studentTools.searchStudents.args.required ?? []).not.toContain("query");
    });
  });

  // ── getStudentMissingDocuments ─────────────────────────────────────────────
  describe("getStudentMissingDocuments", () => {
    it("returns missing documents for a student", async () => {
      const mockDocs = { missing: ["Passport", "IELTS"] };
      studentService.getMissingDocuments.mockResolvedValue(mockDocs);

      const result = await studentTools.getStudentMissingDocuments.run({
        studentId: STUDENT_ID,
      });

      expect(result).toEqual(mockDocs);
      expect(studentService.getMissingDocuments).toHaveBeenCalledWith(STUDENT_ID);
    });

    it("has studentId as required", () => {
      expect(studentTools.getStudentMissingDocuments.args.required).toContain("studentId");
    });
  });

  // ── updateStudentStage ─────────────────────────────────────────────────────
  describe("updateStudentStage", () => {
    it("calls service with studentId and newStage", async () => {
      const mockResult = { success: true, stage: "study_permit" };
      studentService.updateStudentStage.mockResolvedValue(mockResult);

      const result = await studentTools.updateStudentStage.run({
        studentId: STUDENT_ID,
        newStage: "study_permit",
      });

      expect(result).toEqual(mockResult);
      expect(studentService.updateStudentStage).toHaveBeenCalledWith(
        STUDENT_ID,
        "study_permit"
      );
    });

    it("requires both studentId and newStage", () => {
      const { required } = studentTools.updateStudentStage.args;
      expect(required).toContain("studentId");
      expect(required).toContain("newStage");
    });
  });

  // ── addStudentNote ─────────────────────────────────────────────────────────
  describe("addStudentNote", () => {
    it("calls service with studentId and noteText", async () => {
      const mockResult = { success: true };
      studentService.addNote.mockResolvedValue(mockResult);

      const result = await studentTools.addStudentNote.run({
        studentId: STUDENT_ID,
        noteText: "Called student regarding passport",
      });

      expect(result).toEqual(mockResult);
      expect(studentService.addNote).toHaveBeenCalledWith(
        STUDENT_ID,
        "Called student regarding passport"
      );
    });

    it("requires both studentId and noteText", () => {
      const { required } = studentTools.addStudentNote.args;
      expect(required).toContain("studentId");
      expect(required).toContain("noteText");
    });
  });

  // ── getStudentOverview ─────────────────────────────────────────────────────
  describe("getStudentOverview", () => {
    it("returns the overview from the service", async () => {
      const mockOverview = { id: STUDENT_ID, stage: "lead", tasks: [] };
      studentService.getStudentOverview.mockResolvedValue(mockOverview);

      const result = await studentTools.getStudentOverview.run({
        studentId: STUDENT_ID,
      });

      expect(result).toEqual(mockOverview);
      expect(studentService.getStudentOverview).toHaveBeenCalledWith(STUDENT_ID);
    });

    it("has studentId as required", () => {
      expect(studentTools.getStudentOverview.args.required).toContain("studentId");
    });
  });

  // ── Error propagation ──────────────────────────────────────────────────────
  describe("error propagation", () => {
    it("surfaces service errors to the caller", async () => {
      studentService.getStudentById.mockRejectedValue(new Error("Student not found"));

      await expect(
        studentTools.getStudentById.run({ studentId: "bad-id" })
      ).rejects.toThrow("Student not found");
    });
  });
});
