import { useEffect } from "react";
import { createPortal } from "react-dom";

const DocumentViewer = ({
  document: doc,
  onClose,
  onVerify,
  verifying = false,
  onReject,
  rejecting = false,
}) => {
  const hasValidLink = doc?.url && doc.url !== "#";
  const isPDF = doc?.mimeType?.includes("pdf");
  const isImage = doc?.mimeType?.includes("image");

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Safety check - if no document provided, don't render
  if (!doc) {
    return null;
  }

  const handleDownload = () => {
    if (hasValidLink) {
      window.open(doc.url, "_blank");
    }
  };

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const showVerify = typeof onVerify === "function" && hasValidLink;
  const showReject = typeof onReject === "function" && hasValidLink;
  const busy = verifying || rejecting;

  const handleReject = () => {
    const comment = window.prompt(
      "Reason for rejection (optional — shown to the applicant):",
      ""
    );
    // `null` means the admin cancelled the prompt; empty string is an allowed (optional) reason.
    if (comment === null) return;
    onReject(comment.trim());
  };

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div
        className="flex h-full w-full max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:h-[70vh] md:w-[70vw] md:max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {doc.name || "Document"}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {doc.mimeType || "Unknown type"} •{" "}
              {doc.uploadedAt
                ? new Date(doc.uploadedAt).toLocaleDateString()
                : "Upload date unknown"}
            </p>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            {hasValidLink ? (
              <>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span>Download</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  <span>View</span>
                </button>
                {showReject && (
                  <button
                    onClick={handleReject}
                    disabled={busy}
                    className={`px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center space-x-2 ${
                      busy
                        ? "bg-rose-200 text-rose-700 cursor-not-allowed"
                        : "bg-rose-600 text-white hover:bg-rose-700"
                    }`}
                  >
                    {rejecting ? (
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          d="M4 12a8 8 0 018-8"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                    <span>{rejecting ? "Rejecting..." : "Reject"}</span>
                  </button>
                )}
                {showVerify && (
                  <button
                    onClick={onVerify}
                    disabled={busy}
                    className={`px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center space-x-2 ${
                      busy
                        ? "bg-emerald-200 text-emerald-700 cursor-not-allowed"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                  >
                    {verifying ? (
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          d="M4 12a8 8 0 018-8"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                    <span>{verifying ? "Verifying..." : "Verify"}</span>
                  </button>
                )}
              </>
            ) : (
              <div className="px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded flex items-center space-x-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Preview Pending</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Close (ESC)"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-100">
          {!hasValidLink ? (
            <div className="flex h-full items-center justify-center p-8">
              <div className="max-w-md text-center">
                <p className="text-gray-600">
                  Unable to load document preview. Please try again.
                </p>
              </div>
            </div>
          ) : isPDF ? (
            <iframe
              src={doc.url}
              className="h-full min-h-[600px] w-full"
              title={doc.name}
            />
          ) : isImage ? (
            <div className="flex items-center justify-center p-8 h-full">
              <img
                src={doc.url}
                alt={doc.name}
                className="max-w-full max-h-full object-contain rounded shadow-lg"
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-gray-500">
              <div className="text-center">
                <p className="mb-4">
                  Preview not available for this file type.
                </p>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Download File
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default DocumentViewer;
