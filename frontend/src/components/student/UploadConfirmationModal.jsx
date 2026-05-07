import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, UploadCloud, Trash2 } from "lucide-react";
import FilePreview from "../common/FilePreview";
import Button from "../common/Button";

const UploadConfirmationModal = ({
  open,
  file,
  files,
  documentName,
  onClose,
  onConfirm,
  uploading = false,
  uploadProgress = 0,
  fileProgresses = {},
  currentUploadingIndex = null,
  onRemoveFile,
}) => {
  const [previewUrls, setPreviewUrls] = useState({});

  const filesArray = useMemo(() => {
    if (Array.isArray(files) && files.length) return files;
    if (file) return [file];
    return [];
  }, [files, file]);

  // Close on ESC when not uploading
  useEffect(() => {
    if (!open) return;
    const handleEsc = (event) => {
      if (event.key === "Escape" && !uploading) {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, uploading, onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Generate preview URLs for images to mimic system preview window
  useEffect(() => {
    if (!open) return;
    const urls = {};
    filesArray.forEach((selectedFile, index) => {
      if (selectedFile?.type?.startsWith("image/")) {
        urls[index] = URL.createObjectURL(selectedFile);
      }
    });
    setPreviewUrls(urls);
    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [filesArray, open]);

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget && !uploading) {
      onClose?.();
    }
  };

  if (!open || filesArray.length === 0) {
    return null;
  }

  const formatFileSize = (bytes = 0) => {
    if (!bytes) return "--";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 bg-gradient-to-r from-primary/10 via-transparent to-transparent px-8 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
              Confirm Upload
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              {filesArray.length} file{filesArray.length > 1 ? "s" : ""} ready to submit
            </h2>
            <p className="text-sm text-slate-500">
              Review the selected document{filesArray.length > 1 ? "s" : ""} before sending them to your advisor.
            </p>
          </div>
          {!uploading && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close upload dialog"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[70vh] space-y-6 overflow-y-auto px-8 py-8">
          {documentName && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                Document Type
              </p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{documentName}</p>
              <p className="text-xs text-slate-500">
                Make sure the file you selected matches this requirement.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                Selected File{filesArray.length > 1 ? "s" : ""}
              </p>
              <span className="text-xs font-semibold text-slate-500">
                {filesArray.length} item{filesArray.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-3">
              {filesArray.map((selectedFile, index) => {
                const progress = fileProgresses[index];
                const isUploadingThisFile = currentUploadingIndex === index && uploading;
                return (
                  <div
                    key={`${selectedFile?.name || "file"}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-1 items-start gap-3">
                        {previewUrls[index] ? (
                          <img
                            src={previewUrls[index]}
                            alt={selectedFile.name}
                            className="h-12 w-12 rounded-xl border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                            <UploadCloud className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <FilePreview
                            file={selectedFile}
                            showRemove={false}
                            showSize={false}
                            showType={false}
                          />
                          <p className="text-xs text-slate-500">
                            {selectedFile.type || "Unknown type"} • {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                      </div>
                      {!uploading && onRemoveFile && filesArray.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveFile(index)}
                          className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:border-red-200 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      )}
                    </div>
                    {typeof progress === "number" && progress >= 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{isUploadingThisFile ? "Uploading..." : progress === 100 ? "Uploaded" : "Queued"}</span>
                          <span>{progress === -1 ? "Failed" : `${Math.max(progress, 0)}%`}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full ${
                              progress === -1
                                ? "bg-red-500"
                                : progress === 100
                                ? "bg-emerald-500"
                                : "bg-gradient-to-r from-primary to-secondary"
                            }`}
                            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {!uploading && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Files are encrypted, scanned automatically, and shared with your advisor once the upload finishes.
            </div>
          )}

          {uploading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Uploading documents...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-indigo-500 to-purple-500"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">
                Keep this window open until the upload completes. You can continue browsing after this finishes.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-slate-200 px-8 py-5 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            className="w-full sm:w-auto"
            onClick={onConfirm}
            disabled={!filesArray.length || uploading}
          >
            {uploading ? "Uploading..." : `Upload ${filesArray.length > 1 ? "Documents" : "Document"}`}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default UploadConfirmationModal;
