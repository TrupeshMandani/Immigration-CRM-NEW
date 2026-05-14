const { describe, it, expect, jest, beforeEach } = require("@jest/globals");
const { Readable } = require("stream");

// Mock dependencies
jest.mock("../utils/httpClient");
jest.mock("../config/logger");
jest.mock("fs");

const httpClient = require("../utils/httpClient");
const documentTools = require("../tools/documentTools");
const fs = require("fs");

describe("Document Tools Module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Module Structure", () => {
    it("should export all implemented tools", () => {
      expect(documentTools).toHaveProperty("uploadDocument");
      expect(documentTools).toHaveProperty("getStudentDocuments");
      expect(documentTools).toHaveProperty("getDocumentById");
      expect(documentTools).toHaveProperty("verifyDocument");
      expect(documentTools).toHaveProperty("renameDocument");
      expect(documentTools).toHaveProperty("deleteDocument");
    });

    it("should not export skipped tools", () => {
      expect(documentTools).not.toHaveProperty("summarizeDocument");
      expect(documentTools).not.toHaveProperty("explainDocument");
      expect(documentTools).not.toHaveProperty("detectDocumentIssues");
      expect(documentTools).not.toHaveProperty("translateDocument");
      expect(documentTools).not.toHaveProperty("compareDocumentDetails");
    });

    it("should have proper tool structure with description, args, and run", () => {
      const tools = [
        "uploadDocument",
        "getStudentDocuments",
        "getDocumentById",
        "verifyDocument",
        "renameDocument",
        "deleteDocument",
      ];

      tools.forEach((toolName) => {
        expect(documentTools[toolName]).toHaveProperty("description");
        expect(documentTools[toolName]).toHaveProperty("args");
        expect(documentTools[toolName]).toHaveProperty("run");
        expect(typeof documentTools[toolName].run).toBe("function");
      });
    });
  });

  describe("uploadDocument", () => {
    it("should reject when missing required arguments", async () => {
      await expect(
        documentTools.uploadDocument.run({})
      ).rejects.toThrow("Missing required arguments");

      await expect(
        documentTools.uploadDocument.run({ aiKey: "test" })
      ).rejects.toThrow("Missing required arguments");
    });

    it("should reject when file does not exist", async () => {
      fs.existsSync = jest.fn().mockReturnValue(false);

      await expect(
        documentTools.uploadDocument.run({
          aiKey: "test-key",
          documentType: "Passport",
          filePath: "/fake/path.pdf",
        })
      ).rejects.toThrow("File not found");
    });

    it("should upload document successfully", async () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.createReadStream = jest.fn().mockReturnValue(new Readable({ read() {} }));
      fs.promises = { unlink: jest.fn().mockResolvedValue(undefined) };

      httpClient.post = jest.fn().mockResolvedValue({
        data: {
          success: true,
          file: { id: "file-123", name: "document.pdf" },
        },
      });

      const result = await documentTools.uploadDocument.run({
        aiKey: "test-key",
        documentType: "Passport",
        filePath: "/path/to/document.pdf",
      });

      expect(result.success).toBe(true);
      expect(httpClient.post).toHaveBeenCalledWith(
        "/students/test-key/required-documents/files",
        expect.any(Object),
        expect.objectContaining({
          headers: expect.any(Object),
        })
      );
    });
  });

  describe("getStudentDocuments", () => {
    it("should reject when aiKey is missing", async () => {
      await expect(
        documentTools.getStudentDocuments.run({})
      ).rejects.toThrow("Missing required argument: aiKey");
    });

    it("should fetch student documents successfully", async () => {
      const mockFiles = [
        { id: "1", name: "passport.pdf", url: "https://s3.example.com/1" },
        { id: "2", name: "ielts.pdf", url: "https://s3.example.com/2" },
      ];

      httpClient.get = jest.fn().mockResolvedValue({
        data: {
          files: mockFiles,
          totalFiles: 2,
        },
      });

      const result = await documentTools.getStudentDocuments.run({
        aiKey: "test-key",
      });

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(2);
      expect(result.totalFiles).toBe(2);
      expect(httpClient.get).toHaveBeenCalledWith("/students/test-key/files");
    });
  });

  describe("getDocumentById", () => {
    it("should reject when missing required arguments", async () => {
      await expect(
        documentTools.getDocumentById.run({ aiKey: "test" })
      ).rejects.toThrow("Missing required arguments");
    });

    it("should fetch document by ID successfully", async () => {
      httpClient.get = jest.fn().mockResolvedValue({
        data: {
          url: "https://s3.example.com/signed-url",
          name: "passport.pdf",
        },
      });

      const result = await documentTools.getDocumentById.run({
        aiKey: "test-key",
        docId: "doc-123",
        fileId: "file-456",
      });

      expect(result.success).toBe(true);
      expect(result.url).toBe("https://s3.example.com/signed-url");
      expect(httpClient.get).toHaveBeenCalledWith(
        "/students/test-key/required-documents/doc-123/files/file-456/url"
      );
    });
  });

  describe("verifyDocument", () => {
    it("should reject when missing required arguments", async () => {
      await expect(
        documentTools.verifyDocument.run({ aiKey: "test", docId: "doc-123" })
      ).rejects.toThrow("Missing required arguments");
    });

    it("should verify document successfully", async () => {
      httpClient.post = jest.fn().mockResolvedValue({
        data: {
          success: true,
          verified: true,
        },
      });

      const result = await documentTools.verifyDocument.run({
        aiKey: "test-key",
        docId: "doc-123",
        fileId: "file-456",
        verified: true,
        notes: "Document looks good",
      });

      expect(result.success).toBe(true);
      expect(httpClient.post).toHaveBeenCalledWith(
        "/students/test-key/required-documents/doc-123/files/file-456/verify",
        { verified: true, notes: "Document looks good" }
      );
    });
  });

  describe("renameDocument", () => {
    it("should reject when missing required arguments", async () => {
      await expect(
        documentTools.renameDocument.run({ aiKey: "test" })
      ).rejects.toThrow("Missing required arguments");
    });

    it("should rename document successfully", async () => {
      httpClient.post = jest.fn().mockResolvedValue({
        data: { success: true, message: "Document renamed" },
      });

      const result = await documentTools.renameDocument.run({
        aiKey: "test-key",
        documentId: "doc-123",
        newName: "new-passport.pdf",
      });

      expect(result.success).toBe(true);
      expect(httpClient.post).toHaveBeenCalledWith(
        "/students/test-key/documents/doc-123/rename",
        { newName: "new-passport.pdf" }
      );
    });
  });

  describe("deleteDocument", () => {
    it("should reject when neither documentId nor documentName is provided", async () => {
      await expect(
        documentTools.deleteDocument.run({ aiKey: "test" })
      ).rejects.toThrow("Either documentId or documentName must be provided");
    });

    it("should delete document by ID successfully", async () => {
      httpClient.delete = jest.fn().mockResolvedValue({
        data: { success: true, message: "Document deleted" },
      });

      const result = await documentTools.deleteDocument.run({
        aiKey: "test-key",
        documentId: "doc-123",
      });

      expect(result.success).toBe(true);
      expect(httpClient.delete).toHaveBeenCalledWith(
        "/students/test-key/required-documents/doc-123"
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle HTTP errors gracefully", async () => {
      httpClient.get = jest.fn().mockRejectedValue(new Error("Network error"));

      await expect(
        documentTools.getStudentDocuments.run({ aiKey: "test-key" })
      ).rejects.toThrow("getStudentDocuments failed: Network error");
    });

    it("should format error messages consistently", async () => {
      httpClient.post = jest.fn().mockRejectedValue(new Error("401 Unauthorized"));

      await expect(
        documentTools.verifyDocument.run({
          aiKey: "test",
          docId: "doc",
          fileId: "file",
        })
      ).rejects.toThrow("verifyDocument failed: 401 Unauthorized");
    });
  });

  describe("Integration Tests (Mock)", () => {
    it("should simulate AI agent requesting document upload", async () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.createReadStream = jest.fn().mockReturnValue(new Readable({ read() {} }));
      fs.promises = { unlink: jest.fn().mockResolvedValue(undefined) };

      httpClient.post = jest.fn().mockResolvedValue({
        data: { success: true, file: { id: "new-file" } },
      });

      const agentRequest = {
        aiKey: "student-123",
        documentType: "Passport",
        filePath: "/tmp/passport.pdf",
      };

      const result = await documentTools.uploadDocument.run(agentRequest);

      expect(result.success).toBe(true);
      expect(result.message).toContain("uploaded successfully");
    });

    it("should simulate AI agent verifying and then fetching documents", async () => {
      // Step 1: Verify document
      httpClient.post = jest.fn().mockResolvedValue({
        data: { success: true },
      });

      await documentTools.verifyDocument.run({
        aiKey: "student-123",
        docId: "doc-1",
        fileId: "file-1",
        verified: true,
      });

      // Step 2: Fetch all documents
      httpClient.get = jest.fn().mockResolvedValue({
        data: {
          files: [{ id: "file-1", verified: true }],
          totalFiles: 1,
        },
      });

      const result = await documentTools.getStudentDocuments.run({
        aiKey: "student-123",
      });

      expect(result.files[0].verified).toBe(true);
    });
  });
});
