import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, UploadCloud, Eye } from "lucide-react";
import { requiredDocsService } from "../../services/requireDocService";
import { studentService } from "../../services/authService";
import Loading from "../common/Loading";
import Button from "../common/Button";
import DocumentViewer from "./DocumentViewer";
import UploadConfirmationModal from "./UploadConfirmationModal";
import UploadedFilesModal from "./UploadedFilesModal";
import Toast from "../common/Toast";
import { renameFileForRequiredDoc } from "../../utils/fileName";
import {
  normalizeRequiredDoc,
  normalizeRequiredDocs,
  normalizeFileList,
} from "../../utils/requiredDocs";

const initialFilesModalState = {
  open: false,
  doc: null,
  files: [],
  loading: false,
};

const RequiredDocuments = ({ aiKey }) => {
  const [requiredDocs, setRequiredDocs] = useState([]);
  const fileInputsRef = useRef({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewingDoc, setViewingDoc] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [uploadModal, setUploadModal] = useState({
    open: false,
    file: null,
    files: null,
    doc: null,
    uploading: false,
    progress: 0,
    fileProgresses: {},
    currentUploadingIndex: null,
  });
  const [filesModal, setFilesModal] = useState(initialFilesModalState);
  const [studentName, setStudentName] = useState("");

  const deriveStudentName = (data) => {
    if (!data) return "";
    const profile = data.profile || {};
    const contactName =
      data.contactInfo?.name ||
      data.contactInfo?.fullName ||
      data.contactInfo?.studentName ||
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

  const triggerToast = (message, type = "success") => {
    setToast({ show: false, message: "", type });
    window.setTimeout(() => {
      setToast({ show: true, message, type });
    }, 40);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchDocs = async () => {
      if (!aiKey) {
        if (!cancelled) {
          setRequiredDocs([]);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setLoading(true);
        setError("");
      }

      try {
        const docs = await requiredDocsService.get(aiKey);
        if (!cancelled) {
          setRequiredDocs(normalizeRequiredDocs(docs));
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch required documents:", err);
          setError("Unable to load required documents.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchDocs();

    return () => {
      cancelled = true;
    };
  }, [aiKey]);

  useEffect(() => {
    let cancelled = false;
    const fetchStudentName = async () => {
      if (!aiKey) return;
      try {
        const data = await studentService.getStudentByKey(aiKey);
        if (!cancelled) {
          setStudentName(deriveStudentName(data));
        }
      } catch (err) {
        console.error("Failed to fetch student info:", err);
      }
    };
    fetchStudentName();
    return () => {
      cancelled = true;
    };
  }, [aiKey]);

  const openDocument = async (doc, file) => {
    if (!doc?.id || !file?.id) return;
    try {
      const url = await requiredDocsService.fileUrl(aiKey, doc.id, file.id);
      if (url) {
        setViewingDoc({
          docId: doc.id,
          fileId: file.id,
          url,
          name: file.name,
          mimeType: file.mimeType,
          uploadedAt: file.uploadedAt,
        });
      }
      setError("");
    } catch (err) {
      console.error("Unable to open file", err);
      setError("Unable to open file.");
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
      files: filesArray,
      doc: doc,
      uploading: false,
      progress: 0,
      fileProgresses: {},
      currentUploadingIndex: null,
    });
  };

  const handleRemoveFile = (index) => {
    setUploadModal((prev) => {
      const newFiles = [...(prev.files || [])];
      newFiles.splice(index, 1);
      if (newFiles.length === 0) {
        return {
          ...prev,
          open: false,
          files: null,
          file: null,
        };
      }
      return {
        ...prev,
        files: newFiles,
        file: newFiles.length === 1 ? newFiles[0] : null,
      };
    });
  };

  const handleUploadConfirm = async () => {
    const { files, file, doc } = uploadModal;
    const filesArray = files || (file ? [file] : []);
    if (filesArray.length === 0 || !doc) return;

    setUploadModal((prev) => ({
      ...prev,
      uploading: true,
      progress: 0,
      fileProgresses: {},
      currentUploadingIndex: 0,
    }));

    try {
      let updatedDoc = null;
      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < filesArray.length; i++) {
        const currentFile = filesArray[i];
        const fileToUpload = renameFileForRequiredDoc(
          currentFile,
          doc?.name || "Document",
          studentName || "Student",
          filesArray.length > 1 ? i : null
        );

        setUploadModal((prev) => ({
          ...prev,
          currentUploadingIndex: i,
          fileProgresses: {
            ...prev.fileProgresses,
            [i]: 0,
          },
        }));

        try {
          updatedDoc = await requiredDocsService.upload(aiKey, doc.id, fileToUpload, {
            onUploadProgress: (event) => {
              if (!event.total) return;
              const percent = Math.round((event.loaded / event.total) * 100);
              const baseProgress = (i / filesArray.length) * 100;
              const overallProgress = baseProgress + percent / filesArray.length;

              setUploadModal((prev) => ({
                ...prev,
                progress: Math.round(overallProgress),
                fileProgresses: {
                  ...prev.fileProgresses,
                  [i]: percent,
                },
              }));
            },
          });

          setUploadModal((prev) => ({
            ...prev,
            fileProgresses: {
              ...prev.fileProgresses,
              [i]: 100,
            },
          }));
          successCount++;
        } catch (fileError) {
          console.error(`Upload failed for file ${i + 1}:`, fileError);
          failedCount++;
          setUploadModal((prev) => ({
            ...prev,
            fileProgresses: {
              ...prev.fileProgresses,
              [i]: -1,
            },
          }));
        }
      }

      if (updatedDoc) {
        const sanitizedDoc = normalizeRequiredDoc(updatedDoc);
        setRequiredDocs((prev) =>
          prev.map((item) => (item.id === doc.id ? sanitizedDoc : item))
        );
      }

      if (failedCount === 0) {
        triggerToast(`${successCount} document${successCount > 1 ? "s" : ""} uploaded successfully`, "success");
      } else if (successCount > 0) {
        triggerToast(`${successCount} uploaded, ${failedCount} failed`, "error");
      } else {
        triggerToast("Upload failed. Please try again.", "error");
      }

      setTimeout(() => {
        setUploadModal((prev) => ({ ...prev, progress: 100 }));
        setTimeout(() => {
          setUploadModal({
            open: false,
            file: null,
            files: null,
            doc: null,
            uploading: false,
            progress: 0,
            fileProgresses: {},
            currentUploadingIndex: null,
          });
        }, 1500);
      }, 300);
    } catch (err) {
      console.error("Upload failed", err);
      setError("Upload failed. Please try again.");
      triggerToast(err?.response?.data?.message || "Upload failed. Please try again.", "error");
      setUploadModal((prev) => ({
        ...prev,
        uploading: false,
        currentUploadingIndex: null,
      }));
    }
  };

  const handleUploadModalClose = () => {
    if (!uploadModal.uploading) {
      setUploadModal({
        open: false,
        file: null,
        files: null,
        doc: null,
        uploading: false,
        progress: 0,
        fileProgresses: {},
        currentUploadingIndex: null,
      });
    }
  };

  const handleFilesModalClose = () => {
    setFilesModal(initialFilesModalState);
  };

  const handleView = async (doc) => {
    if (!doc?.id) return;
    setFilesModal({ open: true, doc, files: [], loading: true });
    try {
      setError("");
      const files = await requiredDocsService.listFiles(aiKey, doc.id);
      const normalized = normalizeFileList(files);
      setFilesModal((prev) => ({
        ...prev,
        files: normalized,
        loading: false,
      }));
    } catch (err) {
      console.error("Unable to fetch files", err);
      setFilesModal((prev) => ({ ...prev, loading: false }));
      setError("Unable to fetch files");
    }
  };

  const handleDownloadFile = async (doc, file) => {
    if (!doc?.id || !file?.id) return;
    try {
      const url = await requiredDocsService.fileUrl(aiKey, doc.id, file.id);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("Download failed", err);
      triggerToast("Unable to download file. Please try again.", "error");
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
      setError("");
    } catch (err) {
      console.error("Delete failed", err);
      setError("Unable to delete file. Please try again.");
      triggerToast("Unable to delete file. Please try again.", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loading size="sm" text="Loading required documents..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700">
        {error}
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      {requiredDocs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-10 text-center text-sm text-neutral-500">
          <AlertCircle className="mx-auto mb-3 h-6 w-6 text-neutral-400" />
          No documents are currently required. Check back later for updates.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <table className="min-w-full border border-neutral-200 text-sm">
            <thead className="bg-neutral-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                <th className="border border-neutral-200 px-4 py-3">Document</th>
                <th className="border border-neutral-200 px-4 py-3 w-56">Last update</th>
                <th className="border border-neutral-200 px-4 py-3 text-center">Actions</th>
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
                  </td>
                  <td className="border border-neutral-200 px-4 py-3 align-top text-sm text-neutral-600">
                    {latestFileMeta(doc)}
                  </td>
                  <td className="border border-neutral-200 px-4 py-3 text-center align-top">
                    <div className="flex flex-wrap items-center justify-center gap-2">
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
                        className="gap-2 border border-neutral-200 bg-white text-neutral-700 hover:border-primary-400"
                        onClick={() => fileInputsRef.current[doc.id]?.click()}
                      >
                        <UploadCloud className="h-4 w-4" />
                        Upload
                      </Button>
                      {doc.filesCount > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2 border border-neutral-200 bg-white text-neutral-700 hover:border-primary-400"
                          onClick={() => handleView(doc)}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewingDoc && (
        <DocumentViewer document={viewingDoc} onClose={() => setViewingDoc(null)} />
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
        onRemoveFile={handleRemoveFile}
      />
      <Toast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />
    </div>
  );
};

export default RequiredDocuments;
