const { describe, it, expect, jest, beforeEach } = require("@jest/globals");

jest.mock("../services/applicant.service");
jest.mock("../config/logger");

const studentService = require("../services/applicant.service");
const applicantTools = require("../tools/applicantTools");

const STUDENT_ID = "student-abc-123";

describe("Applicant Tools", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Schema shape ───────────────────────────────────────────────────────────
  describe("tool structure", () => {
    const names = [
      "getApplicantById",
      "searchApplicants",
      "getStudentMissingDocuments",
      "updateApplicantStage",
      "addApplicantNote",
      "getApplicantOverview",
    ];

    it.each(names)("%s has description, args, and run()", (name) => {
      expect(applicantTools[name]).toHaveProperty("description");
      expect(applicantTools[name]).toHaveProperty("args");
      expect(typeof applicantTools[name].run).toBe("function");
    });

    it.each(names)("%s args is a valid JSON-schema object", (name) => {
      const { args } = applicantTools[name];
      expect(args.type).toBe("object");
      expect(args.properties).toBeDefined();
    });
  });

  // ── getApplicantById ─────────────────────────────────────────────────────────
  describe("getApplicantById", () => {
    it("returns student data from the service", async () => {
      const mockStudent = { id: STUDENT_ID, first_name: "John", last_name: "Doe" };
      studentService.getApplicantById.mockResolvedValue(mockStudent);

      const result = await applicantTools.getApplicantById.run({ applicantId: STUDENT_ID });

      expect(result).toEqual(mockStudent);
      expect(studentService.getApplicantById).toHaveBeenCalledWith(STUDENT_ID);
    });

    it("has applicantId as required in args schema", () => {
      expect(applicantTools.getApplicantById.args.required).toContain("applicantId");
    });
  });

  // ── searchApplicants ─────────────────────────────────────────────────────────
  describe("searchApplicants", () => {
    it("passes query to the service", async () => {
      const mockList = { applicants: [{ id: "1" }, { id: "2" }] };
      studentService.searchApplicants.mockResolvedValue(mockList);

      const result = await applicantTools.searchApplicants.run({ query: "John" });

      expect(result).toEqual(mockList);
      expect(studentService.searchApplicants).toHaveBeenCalledWith("John");
    });

    it("works without a query (list all)", async () => {
      studentService.searchApplicants.mockResolvedValue({ applicants: [] });

      await applicantTools.searchApplicants.run({});

      expect(studentService.searchApplicants).toHaveBeenCalledWith(undefined);
    });

    it("query is not required in args schema", () => {
      expect(applicantTools.searchApplicants.args.required ?? []).not.toContain("query");
    });
  });

  // ── getStudentMissingDocuments ─────────────────────────────────────────────
  describe("getStudentMissingDocuments", () => {
    it("returns missing documents for a student", async () => {
      const mockDocs = { missing: ["Passport", "IELTS"] };
      studentService.getMissingDocuments.mockResolvedValue(mockDocs);

      const result = await applicantTools.getStudentMissingDocuments.run({
        applicantId: STUDENT_ID,
      });

      expect(result).toEqual(mockDocs);
      expect(studentService.getMissingDocuments).toHaveBeenCalledWith(STUDENT_ID);
    });

    it("has applicantId as required", () => {
      expect(applicantTools.getStudentMissingDocuments.args.required).toContain("applicantId");
    });
  });

  // ── updateApplicantStage ─────────────────────────────────────────────────────
  describe("updateApplicantStage", () => {
    it("calls service with applicantId and newStage", async () => {
      const mockResult = { success: true, stage: "study_permit" };
      studentService.updateApplicantStage.mockResolvedValue(mockResult);

      const result = await applicantTools.updateApplicantStage.run({
        applicantId: STUDENT_ID,
        newStage: "study_permit",
      });

      expect(result).toEqual(mockResult);
      expect(studentService.updateApplicantStage).toHaveBeenCalledWith(
        STUDENT_ID,
        "study_permit"
      );
    });

    it("requires both applicantId and newStage", () => {
      const { required } = applicantTools.updateApplicantStage.args;
      expect(required).toContain("applicantId");
      expect(required).toContain("newStage");
    });
  });

  // ── addApplicantNote ─────────────────────────────────────────────────────────
  describe("addApplicantNote", () => {
    it("calls service with applicantId and noteText", async () => {
      const mockResult = { success: true };
      studentService.addNote.mockResolvedValue(mockResult);

      const result = await applicantTools.addApplicantNote.run({
        applicantId: STUDENT_ID,
        noteText: "Called student regarding passport",
      });

      expect(result).toEqual(mockResult);
      expect(studentService.addNote).toHaveBeenCalledWith(
        STUDENT_ID,
        "Called student regarding passport"
      );
    });

    it("requires both applicantId and noteText", () => {
      const { required } = applicantTools.addApplicantNote.args;
      expect(required).toContain("applicantId");
      expect(required).toContain("noteText");
    });
  });

  // ── getApplicantOverview ─────────────────────────────────────────────────────
  describe("getApplicantOverview", () => {
    it("returns the overview from the service", async () => {
      const mockOverview = { id: STUDENT_ID, stage: "lead", tasks: [] };
      studentService.getApplicantOverview.mockResolvedValue(mockOverview);

      const result = await applicantTools.getApplicantOverview.run({
        applicantId: STUDENT_ID,
      });

      expect(result).toEqual(mockOverview);
      expect(studentService.getApplicantOverview).toHaveBeenCalledWith(STUDENT_ID);
    });

    it("has applicantId as required", () => {
      expect(applicantTools.getApplicantOverview.args.required).toContain("applicantId");
    });
  });

  // ── Error propagation ──────────────────────────────────────────────────────
  describe("error propagation", () => {
    it("surfaces service errors to the caller", async () => {
      studentService.getApplicantById.mockRejectedValue(new Error("Applicant not found"));

      await expect(
        applicantTools.getApplicantById.run({ applicantId: "bad-id" })
      ).rejects.toThrow("Applicant not found");
    });
  });
});
