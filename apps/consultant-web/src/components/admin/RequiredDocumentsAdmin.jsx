import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  UploadCloud,
  Eye,
  Trash2,
  FileCheck2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import Button from "../common/Button";
import DocumentViewer from "../applicant/DocumentViewer";
import UploadConfirmationModal from "../applicant/UploadConfirmationModal";
import UploadedFilesModal from "../applicant/UploadedFilesModal";
import { requiredDocsService } from "../../services/requireDocService";
import { applicantService } from "../../services/authService";
import { renameFileForRequiredDoc } from "../../utils/fileName";
import {
  normalizeRequiredDoc,
  normalizeRequiredDocs,
  normalizeFileList,
} from "../../utils/requiredDocs";

const initialUploadModalState = {
  open: false,
  file: null,
  files: [],
  doc: null,
  uploading: false,
  progress: 0,
  fileProgresses: {},
  currentUploadingIndex: null,
};

const initialFilesModalState = {
  open: false,
  doc: null,
  files: [],
  loading: false,
};

const RequiredDocumentsAdmin = ({ aiKey, autoOpenDocumentId = null }) => {
  const [requiredDocs, setRequiredDocs] = useState([]);
  const [newDoc, setNewDoc] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [uploadModal, setUploadModal] = useState(initialUploadModalState);
  const [filesModal, setFilesModal] = useState(initialFilesModalState);
  const fileInputsRef = useRef({});
  const [applicantName, setApplicantName] = useState("");
  const hasAutoOpened = useRef(false);
  const [verifyingFileId, setVerifyingFileId] = useState(null);

  useEffect(() => {
    hasAutoOpened.current = false;
  }, [autoOpenDocumentId]);

  const deriveApplicantName = (data) => {
    if (!data) return "";
    const profile = data.profile || {};
    const contactName =
      data.contactInfo?.name ||
      data.contactInfo?.fullName ||
      data.contactInfo?.applicantName ||
      "";
    const firstLast = [profile.firstName, profile.lastName].filter(Boolean).join("");
    return (
      contactName ||
      profile.fullName ||
      profile.name ||
      firstLast ||
      data.fullName ||
      data.name ||
      ""
    );
  };

  const triggerToast = useCallback((message, type = "success") => {
    if (type === "error") toast.error(message);
    else if (type === "warning") toast.warning(message);
    else toast.success(message);
  }, []);

  const fetchDocs = useCallback(async () => {
    if (!aiKey) {
      setRequiredDocs([]);
      return;
    }
    try {
      const docs = await requiredDocsService.get(aiKey);
      setRequiredDocs(normalizeRequiredDocs(docs));
    } catch (err) {
      console.error("Failed to load required documents:", err);
    }
  }, [aiKey]);

  useEffect(() => {
    if (aiKey) fetchDocs();
  }, [aiKey, fetchDocs]);

  useEffect(() => {
    let cancelled = false;
    const fetchApplicantName = async () => {
      if (!aiKey) return;
      try {
        const data = await applicantService.getApplicantByKey(aiKey);
        if (!cancelled) {
          setApplicantName(deriveApplicantName(data));
        }
      } catch (error) {
        console.error("Failed to fetch applicant info:", error);
      }
    };
    fetchApplicantName();
    return () => {
      cancelled = true;
    };
  }, [aiKey]);

  useEffect(() => {
    if (!viewingDoc) return;
    const docExists = requiredDocs.some((doc) => doc.id === viewingDoc.docId);
    if (!docExists) {
      setViewingDoc(null);
    }
  }, [requiredDocs, viewingDoc]);

  const handleAdd = async () => {
    if (!newDoc.trim()) return;
    setLoading(true);
    try {
      const updated = await requiredDocsService.add(aiKey, {
        name: newDoc.trim(),
      });
      setRequiredDocs(normalizeRequiredDocs(updated));
      setNewDoc("");
    } catch (err) {
      console.error("Failed to add document:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId) => {
    try {
      const updated = await requiredDocsService.delete(aiKey, docId);
      setRequiredDocs(normalizeRequiredDocs(updated));
      setFilesModal((prev) =>
        prev.doc?.id === docId ? initialFilesModalState : prev
      );
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  };

  const handleView = useCallback(
    async (doc) => {
      if (!doc?.id) return;
      setFilesModal({ open: true, doc, files: [], loading: true });
      try {
        const files = await requiredDocsService.listFiles(aiKey, doc.id);
        const normalized = normalizeFileList(files);
        setFilesModal((prev) => ({
          ...prev,
          files: normalized,
          loading: false,
        }));
      } catch (error) {
        console.error("Failed to list files:", error);
        setFilesModal((prev) => ({ ...prev, loading: false }));
        triggerToast("Unable to load uploaded files.", "error");
      }
    },
    [aiKey, triggerToast]
  );

  useEffect(() => {
    if (!autoOpenDocumentId || hasAutoOpened.current || !requiredDocs.length) {
      return;
    }
    const match = requiredDocs.find((doc) => doc.id === autoOpenDocumentId);
    if (match) {
      hasAutoOpened.current = true;
      handleView(match);
    }
  }, [autoOpenDocumentId, requiredDocs, handleView]);

  const openDocument = async (doc, file) => {
    try {
      const url = await requiredDocsService.fileUrl(aiKey, doc.id, file.id);
      if (url) {
        setViewingDoc({
          docId: doc.id,
          doc,
          fileId: file.id,
          file,
          url,
          name: file.name,
          mimeType: file.mimeType,
          uploadedAt: file.uploadedAt,
        });
      }
    } catch (error) {
      console.error("Failed to open file:", error);
    }
  };

  const handleVerifyFile = async (doc, file) => {
    if (!doc?.id || !file?.id) return;
    setVerifyingFileId(file.id);
    try {
      const updated = await requiredDocsService.verifyFile(aiKey, doc.id, file.id);
      const normalizedDoc = normalizeRequiredDoc(updated);
      setRequiredDocs((prev) =>
        prev.map((item) => (item.id === normalizedDoc.id ? normalizedDoc : item))
      );
      setFilesModal((prev) =>
        prev.doc?.id === normalizedDoc.id
          ? { ...prev, doc: normalizedDoc, files: normalizedDoc.files }
          : prev
      );
      if (viewingDoc?.docId === normalizedDoc.id) {
        const nextFile = normalizedDoc.files.find((f) => f.id === file.id) || file;
        setViewingDoc((prev) => ({
          ...prev,
          doc: normalizedDoc,
          file: nextFile,
          verification: nextFile.verification,
        }));
      }
      triggerToast("Document verified successfully.");
    } catch (error) {
      console.error("Failed to verify document:", error);
      triggerToast("Unable to verify document. Please try again.", "error");
    } finally {
      setVerifyingFileId(null);
    }
  };

  const handleToggleAI = async (doc) => {
    try {
      const updatedDoc = await requiredDocsService.updateSettings(aiKey, doc.id, {
        aiExtractionEnabled: !doc.aiExtractionEnabled,
      });
      const sanitizedDoc = normalizeRequiredDoc(updatedDoc);
      setRequiredDocs((prev) =>
        prev.map((item) => (item.id === doc.id ? sanitizedDoc : item))
      );
    } catch (error) {
      console.error("Failed to update AI setting:", error);
    }
  };

  const handleDeleteFile = async (doc, file) => {
    if (!doc?.id || !file?.id) return;
    try {
      const updatedDoc = await requiredDocsService.deleteFile(aiKey, doc.id, file.id);
      const sanitizedDoc = normalizeRequiredDoc(updatedDoc);
      setRequiredDocs((prev) =>
        prev.map((item) => (item.id === doc.id ? sanitizedDoc : item))
      );
      setViewingDoc((prev) =>
        prev?.docId === doc.id && prev?.fileId === file.id ? null : prev
      );
      setFilesModal((prev) =>
        prev.open && prev.doc?.id === doc.id
          ? { ...prev, files: normalizeFileList(updatedDoc.files || []) }
          : prev
      );
    } catch (error) {
      console.error("Failed to delete file:", error);
      triggerToast("Unable to delete file. Please try again.", "error");
    }
  };

  const handleFileSelect = (doc, files) => {
    if (!files) return;
    const filesArray = Array.isArray(files)
      ? files
      : Array.from(files?.length !== undefined ? files : [files]);
    if (!filesArray.length) return;

    setUploadModal({
      open: true,
      file: filesArray.length === 1 ? filesArray[0] : null,
      files: filesArray,
      doc,
      uploading: false,
      progress: 0,
      fileProgresses: {},
      currentUploadingIndex: null,
    });
  };

  const handleRemoveQueuedFile = (index) => {
    setUploadModal((prev) => {
      const remainingFiles = [...(prev.files || [])];
      remainingFiles.splice(index, 1);

      if (remainingFiles.length === 0) {
        return initialUploadModalState;
      }

      return {
        ...prev,
        files: remainingFiles,
        file: remainingFiles.length === 1 ? remainingFiles[0] : null,
      };
    });
  };

  const handleFilesModalClose = () => {
    setFilesModal(initialFilesModalState);
  };

  const handleDownloadFile = async (doc, file) => {
    if (!doc?.id || !file?.id) return;
    try {
      const url = await requiredDocsService.fileUrl(aiKey, doc.id, file.id);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("Failed to download file:", error);
      triggerToast("Unable to download file. Please try again.", "error");
    }
  };

  const handleUploadConfirm = async () => {
    const { files, doc } = uploadModal;
    if (!files?.length || !doc) return;

    setUploadModal((prev) => ({
      ...prev,
      uploading: true,
      progress: 0,
      fileProgresses: {},
      currentUploadingIndex: 0,
    }));

    let updatedDoc = null;
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const currentFile = files[i];
      const fileToUpload = renameFileForRequiredDoc(
        currentFile,
        doc?.name || "Document",
        applicantName || "Applicant",
        files.length > 1 ? i : null
      );
      setUploadModal((prev) => ({
        ...prev,
        currentUploadingIndex: i,
        fileProgresses: { ...prev.fileProgresses, [i]: 0 },
      }));

        try {
          updatedDoc = await requiredDocsService.upload(aiKey, doc.id, fileToUpload, {
            onUploadProgress: (event) => {
              if (!event.total) return;
            const percent = Math.round((event.loaded / event.total) * 100);
            const baseProgress = (i / files.length) * 100;
            const overall = baseProgress + percent / files.length;
            setUploadModal((prev) => ({
              ...prev,
              progress: Math.round(overall),
              fileProgresses: { ...prev.fileProgresses, [i]: percent },
            }));
          },
        });

        const sanitizedDoc = normalizeRequiredDoc(updatedDoc);
        setRequiredDocs((prev) =>
          prev.map((item) => (item.id === doc.id ? sanitizedDoc : item))
        );
        setUploadModal((prev) => ({
          ...prev,
          fileProgresses: { ...prev.fileProgresses, [i]: 100 },
        }));
        successCount++;
      } catch (error) {
        console.error("Failed to upload document:", error);
        setUploadModal((prev) => ({
          ...prev,
          fileProgresses: { ...prev.fileProgresses, [i]: -1 },
        }));
        failedCount++;
      }
    }

    setTimeout(() => {
      setUploadModal((prev) => ({ ...prev, progress: 100 }));
      setTimeout(() => {
        setUploadModal(initialUploadModalState);
      }, 1200);
    }, 300);

    if (failedCount === 0) {
      triggerToast(
        `${successCount} document${successCount > 1 ? "s" : ""} uploaded successfully`,
        "success"
      );
    } else if (successCount > 0) {
      triggerToast(
        `${successCount} uploaded, ${failedCount} failed`,
        "warning"
      );
    } else {
      triggerToast("Upload failed. Please try again.", "error");
    }

    fetchDocs();
  };

  const handleUploadModalClose = () => {
    if (!uploadModal.uploading) {
      setUploadModal(initialUploadModalState);
    }
  };

  const latestFileMeta = (doc) => {
    const latestFile = Array.isArray(doc.files)
      ? doc.files[doc.files.length - 1]
      : null;
    if (!latestFile) return "Awaiting upload";
    const uploaded = new Date(latestFile.uploadedAt || Date.now()).toLocaleString();
    const status =
      doc.verification?.status === "verified"
        ? "AI verified"
        : doc.verification?.status === "failed"
        ? "Needs manual review"
        : "Awaiting verification";
    return `${uploaded} • ${status}`;
  };

  const iconButtonClasses = "gap-2 px-3 py-2 rounded-lg";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-100 bg-white/80 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileCheck2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              Required document checklist
            </p>
            <p className="text-xs text-neutral-500">
              Add, review, and verify applicant uploads.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {requiredDocs.length} item{requiredDocs.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="rounded-2xl border border-neutral-100 bg-white/90 px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">
              Add document requirement
            </label>
            <input
              type="text"
              placeholder="e.g. Passport copy, Educational certificates"
              value={newDoc}
              onChange={(e) => setNewDoc(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm shadow-soft focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-200/60"
            />
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={handleAdd}
            disabled={!newDoc.trim() || loading}
            className="w-full justify-center sm:w-auto"
          >
            <Sparkles className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {requiredDocs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-10 text-center text-sm text-neutral-500">
          <AlertCircle className="mx-auto mb-3 h-6 w-6 text-neutral-400" />
          No documents are currently required. Add the first requirement above.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <table className="min-w-full border border-neutral-200 text-sm">
            <thead className="bg-neutral-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                <th className="border border-neutral-200 px-4 py-3">Document</th>
                <th className="border border-neutral-200 px-4 py-3 w-56">Last update</th>
                <th className="border border-neutral-200 px-4 py-3 text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {requiredDocs.map((doc) => (
                <tr key={doc.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                  <td className="border border-neutral-200 px-4 py-3 align-top">
                    <p className="font-semibold text-neutral-900 flex flex-wrap items-center gap-2">
                      <span>{doc.name}</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold ${
                          doc.verification?.status === "verified"
                            ? "text-emerald-600"
                            : doc.verification?.status === "failed"
                            ? "text-rose-600"
                            : "text-amber-600"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            doc.verification?.status === "verified"
                              ? "bg-emerald-500"
                              : doc.verification?.status === "failed"
                              ? "bg-rose-500"
                              : "bg-amber-500"
                          }`}
                        />
                        {doc.verification?.status === "verified"
                          ? "Verified"
                          : doc.verification?.status === "failed"
                          ? "Needs review"
                          : "Pending"}
                      </span>
                    </p>
                    {doc.description?.trim() && (
                      <p className="text-xs text-neutral-500">{doc.description}</p>
                    )}
                    {doc.verification?.reason && (
                      <p className="text-xs text-neutral-500">
                        AI note: {doc.verification.reason}
                      </p>
                    )}
                    {doc.verification?.detectedType && (
                      <p className="text-xs text-neutral-500">
                        Detected: {doc.verification.detectedType}
                      </p>
                    )}
                    {typeof doc.verification?.confidence === "number" && (
                      <p className="text-xs text-neutral-500">
                        Confidence {Math.round(doc.verification.confidence * 100)}%
                      </p>
                    )}
                  </td>
                  <td className="border border-neutral-200 px-4 py-3 align-top text-sm text-neutral-600">
                    <p>{latestFileMeta(doc)}</p>
                    {doc.verification?.reason && (
                      <p className="text-xs text-neutral-500">{doc.verification.reason}</p>
                    )}
                  </td>
                  <td className="border border-neutral-200 px-4 py-3 text-center align-top">
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <input
                        ref={(el) => (fileInputsRef.current[doc.id] = el)}
                        type="file"
                        className="hidden"
                        multiple
                        onChange={(event) => {
                          handleFileSelect(doc, event.target.files);
                          event.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`${iconButtonClasses} hover:-translate-y-0.5`}
                        onClick={() => fileInputsRef.current[doc.id]?.click()}
                        title="Upload document"
                        aria-label="Upload document"
                      >
                        <UploadCloud className="h-4 w-4" />
                        <span>Upload</span>
                      </Button>
                      {doc.filesCount > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={`${iconButtonClasses} text-neutral-600 hover:text-primary`}
                          onClick={() => handleView(doc)}
                          title="View uploaded files"
                          aria-label="View uploaded files"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View</span>
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant={doc.aiExtractionEnabled ? "primary" : "ghost"}
                        size="sm"
                        className={`${iconButtonClasses} ${
                          doc.aiExtractionEnabled ? "" : "text-neutral-600 hover:text-primary"
                        }`}
                        onClick={() => handleToggleAI(doc)}
                        title={doc.aiExtractionEnabled ? "Disable AI extraction" : "Enable AI extraction"}
                        aria-label={doc.aiExtractionEnabled ? "Disable AI extraction" : "Enable AI extraction"}
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>{doc.aiExtractionEnabled ? "AI on" : "AI off"}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={`${iconButtonClasses} text-red-600 hover:text-red-700`}
                        onClick={() => handleDelete(doc.id)}
                        title="Delete requirement"
                        aria-label="Delete requirement"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewingDoc && (
        <DocumentViewer
          document={viewingDoc}
          onClose={() => setViewingDoc(null)}
          onVerify={
            viewingDoc.doc && viewingDoc.file
              ? () => handleVerifyFile(viewingDoc.doc, viewingDoc.file)
              : undefined
          }
          verifying={verifyingFileId === viewingDoc.fileId}
        />
      )}
      <UploadedFilesModal
        open={filesModal.open}
        documentName={filesModal.doc?.name}
        files={filesModal.files || []}
        loading={filesModal.loading}
        onClose={handleFilesModalClose}
        onViewFile={(file) => filesModal.doc && openDocument(filesModal.doc, file)}
        onDownloadFile={(file) =>
          filesModal.doc ? handleDownloadFile(filesModal.doc, file) : undefined
        }
        onDeleteFile={
          filesModal.doc ? (file) => handleDeleteFile(filesModal.doc, file) : undefined
        }
        canVerify={Boolean(filesModal.doc)}
        onVerifyFile={(file) =>
          filesModal.doc ? handleVerifyFile(filesModal.doc, file) : undefined
        }
        verifyingFileId={verifyingFileId}
      />

      <UploadConfirmationModal
        open={uploadModal.open}
        file={uploadModal.file}
        files={uploadModal.files}
        documentName={uploadModal.doc?.name}
        onClose={handleUploadModalClose}
        onConfirm={handleUploadConfirm}
        uploading={uploadModal.uploading}
        uploadProgress={uploadModal.progress}
        fileProgresses={uploadModal.fileProgresses}
        currentUploadingIndex={uploadModal.currentUploadingIndex}
        onRemoveFile={handleRemoveQueuedFile}
      />

    </div>
  );
};

export default RequiredDocumentsAdmin;
