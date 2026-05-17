import { useState, useCallback } from "react";
import axios from "axios"; // bare axios — NOT api; presigned URLs embed auth in the URL
import { useDropzone } from "react-dropzone";
import api from "../../services/api";
import { uploadService } from "../../services/uploadService";
import { useAuth } from "../../context/AuthContext";
import FilePreview from "../common/FilePreview";
import Button from "../common/Button";

const DocumentUpload = ({
  onUploadSuccess,
  onUploadError,
  aiKey, // kept for API compat; upload logic now uses user.id from auth context
  maxFiles = 20,
  className = "",
}) => {
  const { user } = useAuth();

  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | uploading | completed | error
  // Per-file progress: { [fileName]: 0-100 }
  const [fileProgress, setFileProgress] = useState({});
  const [errors, setErrors] = useState([]);

  const isUploading = status === "uploading";
  const isCompleted = status === "completed";
  const showProgress = isUploading || isCompleted;
  const dropzoneDisabled = isUploading;

  // Average across all files in the current batch
  const overallProgress =
    files.length === 0
      ? 0
      : Math.round(
          Object.values(fileProgress).reduce((sum, p) => sum + p, 0) /
            files.length
        );

  const onDrop = useCallback(
    (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        const newErrors = rejectedFiles.map(({ file, errors }) => ({
          fileName: file.name,
          errors: errors.map((e) => e.message),
        }));
        setErrors((prev) => [...prev, ...newErrors]);
      }

      if (acceptedFiles.length > 0) {
        const validFiles = acceptedFiles.filter((file) => {
          const validation = uploadService.validateFile(file);
          if (!validation.isValid) {
            setErrors((prev) => [
              ...prev,
              { fileName: file.name, errors: validation.errors },
            ]);
            return false;
          }
          return true;
        });

        setFiles((prev) => {
          const newFiles = [...prev, ...validFiles];
          if (newFiles.length > maxFiles) {
            setErrors((prev) => [
              ...prev,
              {
                fileName: "Selection",
                errors: [
                  `Maximum ${maxFiles} files allowed. You selected ${acceptedFiles.length} files.`,
                ],
              },
            ]);
            return prev;
          }
          return newFiles;
        });
      }
    },
    [maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    maxFiles: maxFiles,
    maxSize: 10 * 1024 * 1024,
    disabled: dropzoneDisabled,
  });

  const removeFile = (fileToRemove) => {
    setFiles((prev) => prev.filter((f) => f !== fileToRemove));
    setErrors((prev) =>
      prev.filter((e) => e.fileName !== fileToRemove.name)
    );
    setFileProgress((prev) => {
      const next = { ...prev };
      delete next[fileToRemove.name];
      return next;
    });
  };

  // ── 3-step presigned-URL upload for a single file ─────────────────────────

  const uploadOneFile = async (file) => {
    // Step 1 — request presigned PUT URL from backend
    const { data } = await api.post("/documents/upload-url", {
      studentId: user.id,
      // documentType omitted → backend defaults to null → appears in getStudentFiles
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    });
    const { uploadUrl, documentId } = data;

    // Step 2 — PUT directly to S3
    // Must use bare axios (not `api`): presigned URLs embed AWS Signature in the
    // URL itself; adding an Authorization header causes SignatureDoesNotMatch 403.
    await axios.put(uploadUrl, file, {
      headers: { "Content-Type": file.type || "application/octet-stream" },
      onUploadProgress: (event) => {
        if (!event.total) return;
        const pct = Math.round((event.loaded / event.total) * 100);
        setFileProgress((prev) => ({ ...prev, [file.name]: pct }));
      },
    });

    // Mark this file at 100% before finalize call
    setFileProgress((prev) => ({ ...prev, [file.name]: 100 }));

    // Step 3 — finalize: backend verifies S3 presence, hashes file, enqueues AI verify
    // 200 = small file hashed inline; 202 = large file, hashing queued — both are success
    await api.post(`/documents/${documentId}/finalize`);

    return file.name;
  };

  // ── Batch upload handler ──────────────────────────────────────────────────

  const handleUpload = async () => {
    if (files.length === 0) return;

    if (!user?.id) {
      setErrors([
        { fileName: "Upload", errors: ["Not authenticated. Please log in again."] },
      ]);
      return;
    }

    setStatus("uploading");
    setFileProgress(Object.fromEntries(files.map((f) => [f.name, 0])));
    setErrors([]);

    const uploaded = [];
    const uploadErrors = [];

    // Sequential uploads — simpler progress tracking, safe within 15-min presigned TTL
    for (const file of files) {
      try {
        const name = await uploadOneFile(file);
        uploaded.push(name);
      } catch (err) {
        console.error(`Upload failed for ${file.name}:`, err);
        uploadErrors.push({
          fileName: file.name,
          errors: [
            err?.response?.data?.message ||
              err?.message ||
              "Upload failed. Please try again.",
          ],
        });
      }
    }

    if (uploadErrors.length > 0) {
      setErrors(uploadErrors);
    }

    if (uploaded.length > 0) {
      setStatus("completed");
      setFiles([]);
      setFileProgress({});
      // Shape preserved: Documents.jsx reads uploaded.length and extractedFields || 0
      // extractedFields is 0 — AI verification now runs async via BullMQ worker
      onUploadSuccess?.({ uploaded, extractedFields: 0 });
    } else {
      setStatus("error");
      onUploadError?.(new Error("All files failed to upload."));
    }

    setTimeout(() => {
      setStatus("idle");
      setFileProgress({});
    }, 800);
  };

  const clearErrors = () => setErrors([]);

  // ── Render (UI unchanged from original) ──────────────────────────────────

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${
            isDragActive
              ? "border-blue-400 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }
          ${dropzoneDisabled ? "pointer-events-none opacity-50" : ""}
        `}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-sm text-gray-600">
            {isDragActive ? (
              <p>Drop the files here...</p>
            ) : (
              <div>
                <p className="font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, DOC, DOCX, PNG, JPG (max 10MB each, up to {maxFiles}{" "}
                  files)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File Preview List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Selected Files ({files.length})
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((file, index) => (
              <FilePreview
                key={`${file.name}-${index}`}
                file={file}
                onRemove={removeFile}
                showSize={true}
                showType={true}
                compact={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {showProgress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>
              {isCompleted ? "Wrapping up..." : "Uploading files..."}
            </span>
            {isUploading && <span>{overallProgress}%</span>}
          </div>
          <div className="w-full overflow-hidden rounded-full bg-gray-200 h-2">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${isCompleted ? 100 : overallProgress}%` }}
            />
          </div>
          {/* Per-file rows when uploading multiple files */}
          {isUploading && files.length > 1 && (
            <div className="space-y-1">
              {files.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center gap-2 text-xs text-gray-500"
                >
                  <span className="truncate flex-1">{file.name}</span>
                  <span className="w-8 text-right tabular-nums">
                    {fileProgress[file.name] ?? 0}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-red-700">Upload Errors</h4>
            <button
              onClick={clearErrors}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Clear
            </button>
          </div>
          <div className="space-y-1">
            {errors.map((error, index) => (
              <div
                key={index}
                className="text-xs text-red-600 bg-red-50 p-2 rounded"
              >
                <strong>{error.fileName}:</strong> {error.errors.join(", ")}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && !dropzoneDisabled && (
        <div className="flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={dropzoneDisabled}
            className="w-full sm:w-auto"
          >
            {`Upload ${files.length} file${files.length > 1 ? "s" : ""}`}
          </Button>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
