const httpClient = require("../utils/httpClient");
const FormData = require("form-data");
const fs = require("fs");
const logger = require("../config/logger");

const buildApplicantPath = (aiKey, suffix = "") =>
  `/applicants/${encodeURIComponent(aiKey)}${suffix}`;
const buildRequiredDocsPath = (aiKey) =>
  buildApplicantPath(aiKey, "/required-documents");
const buildRequiredDocPath = (aiKey, docId, suffix = "") =>
  `${buildRequiredDocsPath(aiKey)}/${encodeURIComponent(docId)}${suffix}`;

const cleanupTempFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
    logger.info(`Removed temp file ${filePath}`);
  } catch (err) {
    if (err.code !== "ENOENT") {
      logger.warn(`Unable to remove temp file ${filePath}: ${err.message}`);
    }
  }
};

/* Tools Skipped (Missing Backend Routes)
   - summarizeDocument: No backend summarization endpoint
   - explainDocument: No backend explanation endpoint
   - detectDocumentIssues: No backend issue detection endpoint
   - translateDocument: No backend translation endpoint
   - compareDocumentDetails: No backend comparison endpoint
*/

/**
 * Upload a document file for an applicant's required document using Smart Upload
 * @param {string} aiKey - Applicant's AI key
 * @param {string} documentType - Type of document (e.g., "Passport", "IELTS")
 * @param {string} filePath - Path to the file to upload
 * @returns {Promise<Object>} Upload result with file metadata
 */
async function uploadDocument({ aiKey, documentType, filePath }) {
  if (!aiKey || !documentType || !filePath) {
    throw new Error(
      "Missing required arguments: aiKey, documentType, and filePath are required"
    );
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  logger.info(
    `[Tool:uploadDocument] starting upload for ${aiKey} (${documentType}) from ${filePath}`
  );
  const formData = new FormData();
  formData.append("file", fs.createReadStream(filePath));
  formData.append("documentType", documentType);

  try {
    // Use unified route: /required-documents/files (no docId needed, uses documentType from body)
    const response = await httpClient.post(
      `${buildRequiredDocsPath(aiKey)}/files`,
      formData,
      {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    logger.info(`Document upload successful for ${aiKey}/${documentType}`);
    return {
      success: true,
      message: "Document uploaded successfully",
      data: response.data,
    };
  } catch (err) {
    logger.error(`uploadDocument failed: ${err.message}`);
    throw new Error(`uploadDocument failed: ${err.message}`);
  } finally {
    await cleanupTempFile(filePath);
  }
}

/**
 * Get all documents for an applicant
 * @param {string} aiKey - Applicant's AI key
 * @returns {Promise<Object>} List of applicant documents with presigned URLs
 */
async function getApplicantDocuments({ aiKey }) {
  try {
    if (!aiKey) {
      throw new Error("Missing required argument: aiKey");
    }

    const response = await httpClient.get(buildApplicantPath(aiKey, "/files"));

    return {
      success: true,
      files: response.data.files || [],
      totalFiles: response.data.totalFiles || 0,
    };
  } catch (err) {
    logger.error(`getApplicantDocuments failed: ${err.message}`);
    throw new Error(`getApplicantDocuments failed: ${err.message}`);
  }
}

/**
 * Get a specific document by ID with presigned URL
 * @param {string} aiKey - Applicant's AI key
 * @param {string} docId - Required document ID
 * @param {string} fileId - File ID
 * @returns {Promise<Object>} Document with presigned URL
 */
async function getDocumentById({ aiKey, docId, fileId }) {
  try {
    if (!aiKey || !docId || !fileId) {
      throw new Error(
        "Missing required arguments: aiKey, docId, and fileId are required"
      );
    }

    const response = await httpClient.get(
      `${buildRequiredDocPath(aiKey, docId)}/files/${encodeURIComponent(
        fileId
      )}/url`
    );

    return {
      success: true,
      url: response.data.url,
      data: response.data,
    };
  } catch (err) {
    logger.error(`getDocumentById failed: ${err.message}`);
    throw new Error(`getDocumentById failed: ${err.message}`);
  }
}

/**
 * Verify a document file (admin only)
 * @param {string} aiKey - Applicant's AI key
 * @param {string} docId - Required document ID
 * @param {string} fileId - File ID to verify
 * @param {boolean} verified - Verification status
 * @param {string} notes - Optional verification notes
 * @returns {Promise<Object>} Verification result
 */
async function verifyDocument({
  aiKey,
  docId,
  fileId,
  verified = true,
  notes = "",
}) {
  try {
    if (!aiKey || !docId || !fileId) {
      throw new Error(
        "Missing required arguments: aiKey, docId, and fileId are required"
      );
    }

    const response = await httpClient.post(
      `${buildRequiredDocPath(aiKey, docId)}/files/${encodeURIComponent(
        fileId
      )}/verify`,
      { verified, notes }
    );

    logger.info(
      `Document verified for ${aiKey}/${docId}/${fileId}: ${verified}`
    );
    return {
      success: true,
      message: "Document verification completed",
      data: response.data,
    };
  } catch (err) {
    logger.error(`verifyDocument failed: ${err.message}`);
    throw new Error(`verifyDocument failed: ${err.message}`);
  }
}

/**
 * Rename a document
 * @param {string} aiKey - Applicant's AI key
 * @param {string} documentId - Document ID
 * @param {string} newName - New document name
 * @returns {Promise<Object>} Rename result
 */
async function renameDocument({ aiKey, documentId, newName }) {
  try {
    if (!aiKey || !documentId || !newName) {
      throw new Error(
        "Missing required arguments: aiKey, documentId, and newName are required"
      );
    }

    const response = await httpClient.post(
      `${buildApplicantPath(aiKey, "/documents")}/${encodeURIComponent(
        documentId
      )}/rename`,
      { newName }
    );

    logger.info(`Document renamed for ${aiKey}/${documentId}: ${newName}`);
    return {
      success: true,
      message: "Document renamed successfully",
      data: response.data,
    };
  } catch (err) {
    logger.error(`renameDocument failed: ${err.message}`);
    throw new Error(`renameDocument failed: ${err.message}`);
  }
}

/**
 * Get required documents for an applicant
 * @param {string} aiKey - Applicant's AI key
 * @returns {Promise<Object>} List of required documents with IDs
 */
async function getRequiredDocuments({ aiKey }) {
  try {
    if (!aiKey) {
      throw new Error("Missing required argument: aiKey");
    }

    const response = await httpClient.get(buildRequiredDocsPath(aiKey));

    return {
      success: true,
      requiredDocuments: response.data.requiredDocuments || [],
    };
  } catch (err) {
    logger.error(`getRequiredDocuments failed: ${err.message}`);
    throw new Error(`getRequiredDocuments failed: ${err.message}`);
  }
}

/**
 * Delete a required document (document type, not a file)
 * @param {string} aiKey - Applicant's AI key
 * @param {string} documentId - Required document ID to delete (optional if documentName is provided)
 * @param {string} documentName - Document name to delete (e.g., "Passport") - will find ID automatically
 * @returns {Promise<Object>} Deletion result
 */
async function deleteDocument({ aiKey, documentId, documentName }) {
  try {
    if (!aiKey) {
      throw new Error("Missing required argument: aiKey is required");
    }

    // If documentName is provided, ALWAYS search all documents to find the matching ID
    // This ensures we get the correct ID even if the document name varies slightly
    // We always search by name to ensure accuracy, even if documentId was also provided
    if (documentName) {
      logger.info(
        `[deleteDocument] Step 1: Searching for document '${documentName}' for applicant ${aiKey}`
      );

      // Step 1: Fetch ALL required documents for the applicant
      const requiredDocsResponse = await httpClient.get(
        buildRequiredDocsPath(aiKey)
      );
      const requiredDocs = requiredDocsResponse.data?.requiredDocuments || [];

      logger.info(
        `[deleteDocument] Step 2: Found ${requiredDocs.length} required documents. Searching for match...`
      );

      // Step 2: Find document by name (case-insensitive, supports partial match)
      const normalizedSearchName = documentName.toLowerCase().trim();
      const matchingDoc = requiredDocs.find((doc) => {
        if (!doc.name) return false;
        const normalizedDocName = doc.name.toLowerCase().trim();
        // Try exact match first
        if (normalizedDocName === normalizedSearchName) return true;
        // Try partial match (e.g., "passport" matches "Passport Copy")
        if (normalizedDocName.includes(normalizedSearchName)) return true;
        if (normalizedSearchName.includes(normalizedDocName)) return true;
        return false;
      });

      if (!matchingDoc) {
        const availableNames = requiredDocs
          .map((d) => d.name)
          .filter(Boolean)
          .join(", ");
        throw new Error(
          `Document '${documentName}' not found for applicant '${aiKey}'. Available documents: ${
            availableNames || "none"
          }`
        );
      }

      if (!matchingDoc.id) {
        throw new Error(
          `Document '${documentName}' found but has no ID. This is a system error.`
        );
      }

      // Step 3: Use the found document ID (override any provided documentId)
      documentId = matchingDoc.id;
      logger.info(
        `[deleteDocument] Step 3: Found matching document! ID: '${documentId}', Name: '${matchingDoc.name}'`
      );
    }

    if (!documentId) {
      throw new Error("Either documentId or documentName must be provided");
    }

    // Step 4: Delete using the found document ID
    logger.info(
      `[deleteDocument] Step 4: Deleting document with ID '${documentId}' for applicant ${aiKey}`
    );
    const response = await httpClient.delete(
      buildRequiredDocPath(aiKey, documentId)
    );

    logger.info(
      `[deleteDocument] Success! Document ${documentId} deleted for applicant ${aiKey}`
    );
    return {
      success: true,
      message: "Document deleted successfully",
      data: response.data,
    };
  } catch (err) {
    logger.error(`deleteDocument failed: ${err.message}`);
    // Provide more helpful error message
    if (err.response?.status === 404) {
      throw new Error(
        `Document not found. The document ID '${documentId}' does not exist for applicant '${aiKey}'. Try using documentName instead (e.g., "Passport").`
      );
    }
    throw new Error(`deleteDocument failed: ${err.message}`);
  }
}

/**
 * Classify document type using AI
 * Note: This uses the AI service directly (no HTTP route)
 * @param {string} text - Document text content
 * @param {Array<string>} images - Array of image URLs (base64)
 * @returns {Promise<Object>} Document classification
 */
async function classifyDocumentType({ text = "", images = [] }) {
  try {
    if (!text && !images.length) {
      throw new Error(
        "Either text or images must be provided for classification"
      );
    }

    // This would typically call the AI service directly
    // For now, we'll call the backend's AI endpoint if it exists
    // Otherwise, this is a placeholder that needs AI service integration

    logger.warn(
      "classifyDocumentType: Direct AI service integration not implemented"
    );
    return {
      success: false,
      message: "AI classification requires direct service integration",
      documentType: "Unknown",
    };
  } catch (err) {
    logger.error(`classifyDocumentType failed: ${err.message}`);
    throw new Error(`classifyDocumentType failed: ${err.message}`);
  }
}

/**
 * Extract document information using AI
 * Note: Partial implementation - AI service exists but no dedicated HTTP route
 * @param {string} aiKey - Applicant's AI key
 * @param {string} documentId - Document ID
 * @returns {Promise<Object>} Extracted document information
 */
async function extractDocument({ aiKey, documentId }) {
  try {
    if (!aiKey || !documentId) {
      throw new Error(
        "Missing required arguments: aiKey and documentId are required"
      );
    }

    logger.warn(
      "extractDocument: Partial implementation - no dedicated HTTP route"
    );
    return {
      success: false,
      message: "Document extraction requires dedicated backend route",
      data: null,
    };
  } catch (err) {
    logger.error(`extractDocument failed: ${err.message}`);
    throw new Error(`extractDocument failed: ${err.message}`);
  }
}

module.exports = {
  uploadDocument: {
    description:
      "Upload a document file. Specify the document type (e.g., 'Passport', 'IELTS') and the system will automatically handle it.",
    args: {
      type: "object",
      properties: {
        aiKey: {
          type: "string",
          description: "Applicant's unique AI key identifier",
        },
        documentType: {
          type: "string",
          description:
            "Type of document (e.g., 'Passport', 'Resume', 'IELTS Result')",
        },
        filePath: {
          type: "string",
          description: "Path to the file to upload",
        },
      },
      required: ["aiKey", "documentType", "filePath"],
    },
    run: async (args) => await uploadDocument(args),
  },

  getApplicantDocuments: {
    description: "Get all documents for an applicant with presigned URLs",
    args: {
      type: "object",
      properties: {
        aiKey: {
          type: "string",
          description: "Applicant's unique AI key identifier",
        },
      },
      required: ["aiKey"],
    },
    run: async (args) => await getApplicantDocuments(args),
  },

  getDocumentById: {
    description: "Get a specific document by ID with presigned URL",
    args: {
      type: "object",
      properties: {
        aiKey: {
          type: "string",
          description: "Applicant's unique AI key identifier",
        },
        docId: {
          type: "string",
          description: "Required document ID",
        },
        fileId: {
          type: "string",
          description: "File ID to retrieve",
        },
      },
      required: ["aiKey", "docId", "fileId"],
    },
    run: async (args) => await getDocumentById(args),
  },

  verifyDocument: {
    description: "Verify a document file (admin only)",
    args: {
      type: "object",
      properties: {
        aiKey: {
          type: "string",
          description: "Applicant's unique AI key identifier",
        },
        docId: {
          type: "string",
          description: "Required document ID",
        },
        fileId: {
          type: "string",
          description: "File ID to verify",
        },
        verified: {
          type: "boolean",
          description: "Verification status (true/false)",
        },
        notes: {
          type: "string",
          description: "Optional verification notes",
        },
      },
      required: ["aiKey", "docId", "fileId"],
    },
    run: async (args) => await verifyDocument(args),
  },

  renameDocument: {
    description: "Rename an applicant document",
    args: {
      type: "object",
      properties: {
        aiKey: {
          type: "string",
          description: "Applicant's unique AI key identifier",
        },
        documentId: {
          type: "string",
          description: "Document ID to rename",
        },
        newName: {
          type: "string",
          description: "New document name",
        },
      },
      required: ["aiKey", "documentId", "newName"],
    },
    run: async (args) => await renameDocument(args),
  },

  getRequiredDocuments: {
    description:
      "Get all required documents for an applicant. Use this to find document IDs before deleting.",
    args: {
      type: "object",
      properties: {
        aiKey: {
          type: "string",
          description: "Applicant's unique AI key identifier",
        },
      },
      required: ["aiKey"],
    },
    run: async (args) => await getRequiredDocuments(args),
  },

  deleteDocument: {
    description:
      "Delete a required document (document type, not a file). When the user asks to delete a document by name (e.g., 'delete passport'), ALWAYS use documentName parameter. The system will: 1) Fetch all required documents, 2) Find the matching document by name, 3) Get its ID, 4) Delete it. Use documentName instead of documentId when the user specifies a document by name.",
    args: {
      type: "object",
      properties: {
        aiKey: {
          type: "string",
          description: "Applicant's unique AI key identifier",
        },
        documentName: {
          type: "string",
          description:
            "Document name to delete (e.g., 'Passport', 'passport', 'IELTS'). REQUIRED when user asks to delete by name. The system will automatically search all documents, find the matching one, and delete it. Use this parameter when the user says 'delete passport' or similar.",
        },
        documentId: {
          type: "string",
          description:
            "Required document ID to delete. Only use this if you already have the exact document ID. Otherwise, use documentName instead.",
        },
      },
      required: ["aiKey"],
    },
    run: async (args) => await deleteDocument(args),
  },

  // classifyDocumentType: {}, // ⚠️ Partial - requires direct AI service integration
  // extractDocument: {}, // ⚠️ Partial - no dedicated backend route

  // ❌ Tools below are commented out due to missing backend routes
  // summarizeDocument: {}, // ❌ No backend route found
  // explainDocument: {}, // ❌ No backend route found
  // detectDocumentIssues: {}, // ❌ No backend route found
  // translateDocument: {}, // ❌ No backend route found
  // compareDocumentDetails: {}, // ❌ No backend route found
};
