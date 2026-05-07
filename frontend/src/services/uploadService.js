import api from "./api";

export const uploadService = {
  // Upload documents with AI processing
  uploadDocuments: async (files, aiKey, options = {}) => {
    const formData = new FormData();

    // Add files to FormData
    files.forEach((file) => {
      formData.append("files", file);
    });

    // Add aiKey to FormData
    formData.append("aiKey", aiKey);

    const response = await api.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: options.onUploadProgress,
    });

    return response.data;
  },

  // Get student files from Google Drive
  getStudentFiles: async (aiKey) => {
    const response = await api.get(`/students/${aiKey}/files`);
    return response.data;
  },

  renameDocument: async (aiKey, documentId, newName) => {
    const response = await api.post(
      `/students/${aiKey}/documents/${documentId}/rename`,
      { newName }
    );
    return response.data;
  },

  deleteDocument: async (aiKey, documentId) => {
    try {
      console.log("UploadService: Deleting document", { aiKey, documentId });
      const response = await api.delete(
        `/students/${aiKey}/documents/${documentId}`
      );
      console.log("UploadService: Delete response", response.data);
      return response.data;
    } catch (error) {
      console.error("UploadService: Delete error", error);
      throw error;
    }
  },

  // Get student profile with extracted data
  getStudentProfile: async (aiKey) => {
    const response = await api.get(`/students/${aiKey}`);
    return response.data;
  },

  // Get document categories/tags
  getDocumentCategories: () => {
    return [
      { id: "passport", name: "Passport", color: "blue" },
      { id: "education", name: "Education", color: "green" },
      { id: "work", name: "Work Experience", color: "purple" },
      { id: "health", name: "Health Records", color: "red" },
      { id: "financial", name: "Financial", color: "yellow" },
      { id: "other", name: "Other", color: "gray" },
    ];
  },

  // Validate file before upload
  validateFile: (file) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const maxSize = 10 * 1024 * 1024; // 10MB

    const errors = [];

    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not supported`);
    }

    if (file.size > maxSize) {
      errors.push(
        `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds 10MB limit`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Get file icon based on type
  getFileIcon: (mimeType) => {
    if (!mimeType || typeof mimeType !== "string") return "📁";
    if (mimeType.includes("pdf")) return "📄";
    if (mimeType.includes("image")) return "🖼️";
    if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
    return "📁";
  },

  // Format file size
  formatFileSize: (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },
};
