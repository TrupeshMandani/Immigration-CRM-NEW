import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Eye, Download, Trash2, FileText, Loader2 } from "lucide-react";
import Button from "../common/Button";
import VerificationBadge from "../common/VerificationBadge";

const UploadedFilesModal = ({
  open,
  documentName,
  files = [],
  loading = false,
  onClose,
  onViewFile,
  onDownloadFile,
  onDeleteFile,
  canVerify = false,
  onVerifyFile,
  verifyingFileId = null,
}) => {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const formatDate = (value) => {
    if (!value) return "Unknown date";
    const parsed = new Date(value);
    return parsed.toLocaleString();
  };

  const formatFileSize = (size) => {
    if (!size) return "--";
    const units = ["B", "KB", "MB", "GB"];
    const order = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
    return `${(size / Math.pow(1024, order)).toFixed(1)} ${units[order]}`;
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 bg-gradient-to-r from-secondary/10 via-transparent to-transparent px-8 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-secondary">
              Uploaded Files
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 line-clamp-2">
              {documentName || "Document"}
            </h2>
            <p className="text-sm text-slate-500">
              Review submissions, preview, download, or remove items in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close uploaded files dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-8 py-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-secondary" />
              Fetching uploaded files...
            </div>
          ) : files.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
              <p className="font-semibold text-slate-700">No files uploaded yet</p>
              <p className="mt-2 text-xs text-slate-500">
                Once a document is submitted, it will appear here for quick review.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-1 items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">
                          {file.mimeType || "Unknown type"} • {formatFileSize(file.size)}
                        </p>
                        <p className="text-xs text-slate-400">
                          Uploaded {formatDate(file.uploadedAt || Date.now())}
                        </p>
                        {file.verification && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <VerificationBadge
                              status={file.verification.status}
                              reason={file.verification.reason}
                              minimal
                            />
                            {file.verification.detectedType && (
                              <span className="font-medium text-slate-600">
                                {file.verification.detectedType}
                              </span>
                            )}
                            {typeof file.verification.confidence === "number" && (
                              <span>
                                Confidence {Math.round(file.verification.confidence * 100)}%
                              </span>
                            )}
                            {file.verification.reason && !file.verification.detectedType && (
                              <span>{file.verification.reason}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {onViewFile && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 border border-neutral-200 bg-white text-neutral-700 hover:border-primary-400"
                          onClick={() => onViewFile(file)}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      )}
                      {onDownloadFile && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-slate-600 hover:text-secondary"
                          onClick={() => onDownloadFile(file)}
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      )}
                      {onDeleteFile && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-red-600 hover:text-red-700"
                          onClick={() => onDeleteFile(file)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      )}
                      {canVerify && onVerifyFile && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 border border-emerald-200 text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50"
                          onClick={() => onVerifyFile(file)}
                          loading={verifyingFileId === file.id}
                        >
                          Verify
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-8 py-5 sm:flex-row sm:items-center sm:justify-end">
          <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default UploadedFilesModal;
