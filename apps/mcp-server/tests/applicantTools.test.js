const { describe, it, expect, jest, beforeEach } = require("@jest/globals");

jest.mock("../services/applicant.service");
jest.mock("../config/logger");

const applicantService = require("../services/applicant.service");
const applicantTools = require("../tools/applicantTools");

const APPLICANT_ID = "applicant-abc-123";

describe("Applicant Tools", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Schema shape ───────────────────────────────────────────────────────────
  describe("tool structure", () => {
    const names = [
      "getApplicantById",
      "searchApplicants",
      "getApplicantMissingDocuments",
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
    it("returns applicant data from the service", async () => {
      const mockApplicant = { id: APPLICANT_ID, first_name: "John", last_name: "Doe" };
      applicantService.getApplicantById.mockResolvedValue(mockApplicant);

      const result = await applicantTools.getApplicantById.run({ applicantId: APPLICANT_ID });

      expect(result).toEqual(mockApplicant);
      expect(applicantService.getApplicantById).toHaveBeenCalledWith(APPLICANT_ID);
    });

    it("has applicantId as required in args schema", () => {
      expect(applicantTools.getApplicantById.args.required).toContain("applicantId");
    });
  });

  // ── searchApplicants ─────────────────────────────────────────────────────────
  describe("searchApplicants", () => {
    it("passes query to the service", async () => {
      const mockList = { applicants: [{ id: "1" }, { id: "2" }] };
      applicantService.searchApplicants.mockResolvedValue(mockList);

      const result = await applicantTools.searchApplicants.run({ query: "John" });

      expect(result).toEqual(mockList);
      expect(applicantService.searchApplicants).toHaveBeenCalledWith("John");
    });

    it("works without a query (list all)", async () => {
      applicantService.searchApplicants.mockResolvedValue({ applicants: [] });

      await applicantTools.searchApplicants.run({});

      expect(applicantService.searchApplicants).toHaveBeenCalledWith(undefined);
    });

    it("query is not required in args schema", () => {
      expect(applicantTools.searchApplicants.args.required ?? []).not.toContain("query");
    });
  });

  // ── getApplicantMissingDocuments ─────────────────────────────────────────────
  describe("getApplicantMissingDocuments", () => {
    it("returns missing documents for an applicant", async () => {
      const mockDocs = { missing: ["Passport", "IELTS"] };
      applicantService.getMissingDocuments.mockResolvedValue(mockDocs);

      const result = await applicantTools.getApplicantMissingDocuments.run({
        applicantId: APPLICANT_ID,
      });

      expect(result).toEqual(mockDocs);
      expect(applicantService.getMissingDocuments).toHaveBeenCalledWith(APPLICANT_ID);
    });

    it("has applicantId as required", () => {
      expect(applicantTools.getApplicantMissingDocuments.args.required).toContain("applicantId");
    });
  });

  // ── updateApplicantStage ─────────────────────────────────────────────────────
  describe("updateApplicantStage", () => {
    it("calls service with applicantId and newStage", async () => {
      const mockResult = { success: true, stage: "study_permit" };
      applicantService.updateApplicantStage.mockResolvedValue(mockResult);

      const result = await applicantTools.updateApplicantStage.run({
        applicantId: APPLICANT_ID,
        newStage: "study_permit",
      });

      expect(result).toEqual(mockResult);
      expect(applicantService.updateApplicantStage).toHaveBeenCalledWith(
        APPLICANT_ID,
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
      applicantService.addNote.mockResolvedValue(mockResult);

      const result = await applicantTools.addApplicantNote.run({
        applicantId: APPLICANT_ID,
        noteText: "Called applicant regarding passport",
      });

      expect(result).toEqual(mockResult);
      expect(applicantService.addNote).toHaveBeenCalledWith(
        APPLICANT_ID,
        "Called applicant regarding passport"
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
      const mockOverview = { id: APPLICANT_ID, stage: "lead", tasks: [] };
      applicantService.getApplicantOverview.mockResolvedValue(mockOverview);

      const result = await applicantTools.getApplicantOverview.run({
        applicantId: APPLICANT_ID,
      });

      expect(result).toEqual(mockOverview);
      expect(applicantService.getApplicantOverview).toHaveBeenCalledWith(APPLICANT_ID);
    });

    it("has applicantId as required", () => {
      expect(applicantTools.getApplicantOverview.args.required).toContain("applicantId");
    });
  });

  // ── Error propagation ──────────────────────────────────────────────────────
  describe("error propagation", () => {
    it("surfaces service errors to the caller", async () => {
      applicantService.getApplicantById.mockRejectedValue(new Error("Applicant not found"));

      await expect(
        applicantTools.getApplicantById.run({ applicantId: "bad-id" })
      ).rejects.toThrow("Applicant not found");
    });
  });
});
