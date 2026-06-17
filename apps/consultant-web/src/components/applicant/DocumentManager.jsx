import { useState, useEffect, useCallback } from "react";
import { uploadService } from "../../services/uploadService";
import { withDisplayName } from "../../utils/fileName";
import FilePreview from "../common/FilePreview";
import Button from "../common/Button";
import Loading from "../common/Loading";
import DocumentViewer from "./DocumentViewer";
import ConfirmDialog from "../common/ConfirmDialog";

const DocumentManager = ({
  aiKey,
  onDocumentClick,
  showCategories = true,
  showSearch = true,
  showFilters = true,
  className = "",
}) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState("date"); // 'date', 'name', 'size', 'type'
  const [viewingDocument, setViewingDocument] = useState(null);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    document: null,
  });
  const [confirmState, setConfirmState] = useState({ open: false, doc: null });

  const categories = uploadService.getDocumentCategories();

  const normalizeDocument = useCallback(
    (file, index = 0) => {
      const withName = withDisplayName(file, `Document ${index + 1}`);
      return {
        ...withName,
        id:
          withName?._id ||
          withName?.id ||
          withName?.key ||
          file?._id ||
          file?.id ||
          `doc-${index}`,
        mimeType: withName?.mimeType || "application/octet-stream",
        size: withName?.size || 0,
        url: withName?.url || withName?.webViewLink || "#",
        uploadedAt:
          withName?.uploadedAt ||
          withName?.modifiedTime ||
          new Date().toISOString(),
      };
    },
    []
  );

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(""); // Clear any previous errors

      if (!aiKey) {
        throw new Error("No aiKey provided");
      }

      console.log("📁 DocumentManager: Fetching documents for aiKey:", aiKey);
      const response = await uploadService.getApplicantFiles(aiKey);
      console.log("📁 DocumentManager: Received response:", response);
      console.log("📁 DocumentManager: Files array:", response.files);

      // Ensure files array is properly formatted
      const files = response.files || [];
      const formattedFiles = files.map((file, index) =>
        normalizeDocument(file, index)
      );

      console.log("📁 DocumentManager: Formatted files:", formattedFiles);
      setDocuments(formattedFiles);
    } catch (err) {
      const errorMessage = err.message || "Failed to load documents";
      setError(errorMessage);
      console.error("Error fetching documents:", err);
    } finally {
      setLoading(false);
    }
  }, [aiKey, normalizeDocument]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const showContextMenu = (event, document) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      document,
    });
  };

  const hideContextMenu = useCallback(() => {
    setContextMenu((prev) =>
      prev.visible ? { visible: false, x: 0, y: 0, document: null } : prev
    );
  }, []);

  useEffect(() => {
    const handleGlobalClick = () => hideContextMenu();
    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("scroll", handleGlobalClick, true);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("scroll", handleGlobalClick, true);
    };
  }, [hideContextMenu]);

  const getDocumentCategory = (fileName) => {
    const name = fileName.toLowerCase();
    if (name.includes("passport")) return "passport";
    if (
      name.includes("education") ||
      name.includes("degree") ||
      name.includes("diploma")
    )
      return "education";
    if (
      name.includes("work") ||
      name.includes("experience") ||
      name.includes("employment")
    )
      return "work";
    if (name.includes("health") || name.includes("medical")) return "health";
    if (
      name.includes("financial") ||
      name.includes("bank") ||
      name.includes("income")
    )
      return "financial";
    return "other";
  };

  const getCategoryColor = (categoryId) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category?.color || "gray";
  };

  const filteredDocuments = documents
    .filter((doc) => {
      const matchesSearch =
        !searchTerm ||
        doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.originalName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        !selectedCategory ||
        getDocumentCategory(doc.name || doc.originalName) === selectedCategory;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.name || a.originalName || "").localeCompare(
            b.name || b.originalName || ""
          );
        case "size":
          return (b.size || 0) - (a.size || 0);
        case "type":
          return (a?.mimeType || a?.type || "").localeCompare(
            b?.mimeType || b?.type || ""
          );
        case "date":
        default:
          return (
            new Date(b.uploadedAt || b.createdAt || 0) -
            new Date(a.uploadedAt || a.createdAt || 0)
          );
      }
    });

  const handleDocumentClick = (document) => {
    hideContextMenu();
    if (onDocumentClick) {
      onDocumentClick(document);
    } else {
      setViewingDocument(document);
    }
  };

  const handleDownload = (doc) => {
    hideContextMenu();
    if (!doc?.url) return;
    const link = window.document.createElement("a");
    link.href = doc.url;
    link.download = doc.name || "document";
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleRename = async (doc) => {
    hideContextMenu();
    const currentName = doc?.name || "";
    const newName = window.prompt("Enter a new file name", currentName);
    if (!newName || newName.trim() === currentName) return;

    try {
      setLoading(true);
      const response = await uploadService.renameDocument(
        aiKey,
        doc.id,
        newName.trim()
      );
      const updatedDoc = normalizeDocument(response.document);
      setDocuments((prev) =>
        prev.map((item) => (item.key === doc.key ? updatedDoc : item))
      );
    } catch (err) {
      console.error("Error renaming document:", err);
      setError(err.message || "Failed to rename document");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (doc) => {
    hideContextMenu();
    setConfirmState({ open: true, doc });
  };

  const confirmDelete = async () => {
    const doc = confirmState.doc;
    setConfirmState({ open: false, doc: null });
    if (!doc) return;

    try {
      setLoading(true);
      await uploadService.deleteDocument(aiKey, doc.id);
      setDocuments((prev) =>
        prev.filter((item) => item.id !== doc.id && item.key !== doc.key)
      );
      if (viewingDocument?.id === doc.id || viewingDocument?.key === doc.key) {
        setViewingDocument(null);
      }
      setError("");
    } catch (err) {
      console.error("Error deleting document:", err);
      setError(err.message || "Failed to delete document");
    } finally {
      setLoading(false);
    }
  };

  const cancelDelete = () => setConfirmState({ open: false, doc: null });

  if (!aiKey) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-600 px-4 py-3 rounded-md">
          <p>No applicant key available. Please log in again.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <Loading size="lg" text="Loading documents..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
        <Button onClick={fetchDocuments} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        {showSearch && (
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Category Filter */}
        {showCategories && (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        )}

        {/* Sort */}
        {showFilters && (
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="size">Sort by Size</option>
            <option value="type">Sort by Type</option>
          </select>
        )}

        {/* View Mode Toggle */}
        <div className="flex border border-gray-300 rounded-md">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-2 text-sm ${
              viewMode === "grid"
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-2 text-sm ${
              viewMode === "list"
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Documents Count */}
      <div className="text-sm text-gray-600">
        {filteredDocuments.length} document
        {filteredDocuments.length !== 1 ? "s" : ""} found
      </div>

      {/* Documents Grid/List */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No documents
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedCategory
              ? "No documents match your search criteria."
              : "Upload your first document to get started."}
          </p>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-2"
          }
        >
          {filteredDocuments.map((document, index) => {
            const category = getDocumentCategory(
              document.name || document.originalName
            );
            const categoryColor = getCategoryColor(category);

            return (
              <div
                key={document.id || index}
                onClick={() => handleDocumentClick(document)}
                onContextMenu={(event) => showContextMenu(event, document)}
                className={`
                  ${
                    viewMode === "grid"
                      ? "bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      : "bg-white border rounded p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  }
                `}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">
                      {uploadService.getFileIcon(
                        document?.mimeType || document?.type
                      )}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {document.name || document.originalName}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${categoryColor}-100 text-${categoryColor}-800`}
                      >
                        {categories.find((cat) => cat.id === category)?.name ||
                          "Other"}
                      </span>
                      {document.size && (
                        <span className="text-xs text-gray-500">
                          {uploadService.formatFileSize(document.size)}
                        </span>
                      )}
                    </div>
                    {document.uploadedAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Uploaded{" "}
                        {new Date(document.uploadedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {document.url && (
                    <div className="flex-shrink-0">
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewer
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}

      {contextMenu.visible && contextMenu.document && (
        <div
          className="fixed z-50 w-48 rounded-md border border-gray-200 bg-white py-2 shadow-lg"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => handleDocumentClick(contextMenu.document)}
          >
            View
          </button>
          <button
            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => handleDownload(contextMenu.document)}
          >
            Download
          </button>
          <button
            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => handleRename(contextMenu.document)}
          >
            Rename
          </button>
          <button
            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={() => handleDelete(contextMenu.document)}
          >
            Delete
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmState.open}
        title="Delete document?"
        description={
          confirmState.doc
            ? `Are you sure you want to delete "${confirmState.doc.name}"? This action cannot be undone.`
            : "Are you sure you want to delete this document?"
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
};

export default DocumentManager;
