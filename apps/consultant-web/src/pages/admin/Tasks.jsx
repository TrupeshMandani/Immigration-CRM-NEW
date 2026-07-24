import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { RefreshCcw } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import VerificationBadge from "../../components/common/VerificationBadge";
import { taskService } from "../../services/taskService";
import { authService } from "../../services/authService";
import { useSocket } from "../../hooks/useSocket";
import UploadedFilesModal from "../../components/applicant/UploadedFilesModal";
import DocumentViewer from "../../components/applicant/DocumentViewer";
import { requiredDocsService } from "../../services/requireDocService";
import { normalizeFileList, normalizeRequiredDoc } from "../../utils/requiredDocs";

const statusFilters = [
  { label: "All statuses", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Verified", value: "verified" },
  { label: "Failed", value: "failed" },
];

// The status tabs (pending/verified/failed) are UI-derived states, NOT the raw
// DB status column (open/in_progress/done/dismissed). "verified" vs "failed"
// depends on the AI verdict stored in metadata, so filtering must happen here
// on the client — the backend can only filter by the raw status column.
const deriveDisplayStatus = (task) => {
  if (task.status !== "done") return "pending";
  return task.verificationStatus === "failed" ? "failed" : "verified";
};

const initialPreviewState = {
  open: false,
  doc: null,
  files: [],
  loading: false,
};

const TasksPage = () => {
  const { socket } = useSocket() || {};
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState({
    status: "all",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewModal, setPreviewModal] = useState({
    open: false,
    doc: null,
    files: [],
    loading: false,
  });
  const [viewingDoc, setViewingDoc] = useState(null);
  const [verifyingFileId, setVerifyingFileId] = useState(null);
  const [rejectingFileId, setRejectingFileId] = useState(null);
  const autoOpenTaskRef = useRef(false);

  const fetchTasks = useCallback(
    async ({ withLoader = true } = {}) => {
      try {
        if (withLoader) {
          setLoading(true);
        }
        setError("");
        // Fetch all tasks regardless of status — status filtering is derived on
        // the client (see deriveDisplayStatus) because pending/verified/failed
        // don't map one-to-one to the DB status column.
        const query = {
          limit: 100,
        };
        const data = await taskService.list(query);
        setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      } catch (err) {
        console.error("Failed to load tasks:", err);
        setError("Unable to load tasks. Please try again.");
      } finally {
        if (withLoader) {
          setLoading(false);
        } else {
          setTimeout(() => setLoading(false), 0);
        }
      }
    },
    []
  );

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!socket) return undefined;
    const refresh = () => fetchTasks({ withLoader: false });
    socket.on("task:created", refresh);
    socket.on("task:updated", refresh);
    return () => {
      socket.off("task:created", refresh);
      socket.off("task:updated", refresh);
    };
  }, [socket, fetchTasks]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const buildDocMeta = useCallback(
    (task) => ({
      // The files API keys documents by their type slug (e.g. "passport"),
      // NOT by the documents-table UUID. documentSlug is the slug; documentField
      // falls back to the slug on worker-created tasks.
      id: task.documentSlug || task.documentField,
      name: task.documentField || "Document",
      aiKey: task.applicantAiKey,
      applicantId: task.applicantId,
    }),
    []
  );

  const handleOpenPreview = useCallback(
    async (task) => {
      let docMeta = buildDocMeta(task);
      // Older tasks may not carry applicantAiKey in metadata; resolve it from
      // the applicant id so the document can still be opened.
      if (!docMeta.aiKey && docMeta.applicantId) {
        try {
          const applicant = await authService.getApplicantById(docMeta.applicantId);
          const resolvedKey = applicant?.aiKey || applicant?.ai_key;
          if (resolvedKey) {
            docMeta = { ...docMeta, aiKey: resolvedKey };
          }
        } catch (err) {
          console.error("Failed to resolve applicant AI key for task:", err);
        }
      }
      if (!docMeta.aiKey || !docMeta.id) {
        setError("File information missing for this task.");
        return;
      }
      setPreviewModal({
        open: true,
        doc: docMeta,
        files: [],
        loading: true,
      });
      try {
        const files = await requiredDocsService.listFiles(docMeta.aiKey, docMeta.id);
        const normalizedFiles = normalizeFileList(files);
        setPreviewModal({
          open: true,
          doc: { ...docMeta, files: normalizedFiles },
          files: normalizedFiles,
          loading: false,
        });
        setError("");
      } catch (err) {
        console.error("Failed to load files for task:", err);
        setPreviewModal((prev) => ({ ...prev, loading: false }));
        setError("Unable to open document preview.");
      }
    },
    [buildDocMeta]
  );

  const handlePreviewClose = useCallback(() => {
    setPreviewModal(initialPreviewState);
    setViewingDoc(null);
  }, []);

  const openPreviewFile = useCallback(
    async (file) => {
      if (!previewModal.doc?.aiKey || !previewModal.doc?.id || !file?.id) return;
      try {
        const url = await requiredDocsService.fileUrl(
          previewModal.doc.aiKey,
          previewModal.doc.id,
          file.id
        );
        if (url) {
          setViewingDoc({
            docId: previewModal.doc.id,
            doc: previewModal.doc,
            fileId: file.id,
            file,
            url,
            name: file.name,
            mimeType: file.mimeType,
            uploadedAt: file.uploadedAt,
          });
        }
      } catch (err) {
        console.error("Failed to open file:", err);
        setError("Unable to open file preview.");
      }
    },
    [previewModal.doc]
  );

  const handleDownloadFile = useCallback(
    async (file) => {
      if (!previewModal.doc?.aiKey || !previewModal.doc?.id || !file?.id) return;
      try {
        const url = await requiredDocsService.fileUrl(
          previewModal.doc.aiKey,
          previewModal.doc.id,
          file.id
        );
        if (url) {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      } catch (err) {
        console.error("Failed to download file:", err);
        setError("Unable to download file.");
      }
    },
    [previewModal.doc]
  );

  const handleVerifyFile = useCallback(
    async (file) => {
      if (!previewModal.doc?.aiKey || !previewModal.doc?.id || !file?.id) return;
      setVerifyingFileId(file.id);
      try {
        const updatedDoc = await requiredDocsService.verifyFile(
          previewModal.doc.aiKey,
          previewModal.doc.id,
          file.id
        );
        const normalizedDoc = normalizeRequiredDoc(updatedDoc);
        setPreviewModal((prev) => ({
          ...prev,
          doc: { ...prev.doc, ...normalizedDoc },
          files: normalizedDoc.files,
        }));
        if (viewingDoc?.fileId === file.id) {
          const nextFile =
            normalizedDoc.files.find((item) => item.id === file.id) || file;
          setViewingDoc((prev) => ({
            ...prev,
            doc: { ...prev.doc, ...normalizedDoc },
            file: nextFile,
            name: nextFile.name,
            mimeType: nextFile.mimeType,
            uploadedAt: nextFile.uploadedAt,
          }));
        }
        setError("");
        await fetchTasks({ withLoader: false });
      } catch (err) {
        console.error("Failed to verify document:", err);
        setError("Unable to verify document. Please try again.");
      } finally {
        setVerifyingFileId(null);
      }
    },
    [previewModal.doc, viewingDoc, fetchTasks]
  );

  const handleRejectFile = useCallback(
    async (file, reason = "") => {
      if (!previewModal.doc?.aiKey || !previewModal.doc?.id || !file?.id) return;
      setRejectingFileId(file.id);
      try {
        await requiredDocsService.rejectFile(
          previewModal.doc.aiKey,
          previewModal.doc.id,
          file.id,
          reason
        );
        setError("");
        // Close the viewer/preview and refresh — the doc is now rejected.
        setViewingDoc(null);
        setPreviewModal(initialPreviewState);
        await fetchTasks({ withLoader: false });
      } catch (err) {
        console.error("Failed to reject document:", err);
        setError("Unable to reject document. Please try again.");
      } finally {
        setRejectingFileId(null);
      }
    },
    [previewModal.doc, fetchTasks]
  );

  const handleDeleteTask = useCallback(
    async (task) => {
      if (!task?.id) return;
      const confirmed = window.confirm("Delete this verification task?");
      if (!confirmed) return;
      try {
        await taskService.delete(task.id);
        await fetchTasks({ withLoader: false });
      } catch (err) {
        console.error("Failed to delete task:", err);
        setError("Unable to delete task. Please try again.");
      }
    },
    [fetchTasks]
  );

  const searchParamsString = useMemo(() => searchParams.toString(), [searchParams]);
  const taskIdFromQuery = searchParams.get("taskId");

  useEffect(() => {
    if (!taskIdFromQuery || autoOpenTaskRef.current === taskIdFromQuery) {
      return;
    }
    if (!tasks.length) {
      return;
    }
    const match = tasks.find((task) => task.id === taskIdFromQuery);
    if (match) {
      autoOpenTaskRef.current = taskIdFromQuery;
      handleOpenPreview(match);
      const next = new URLSearchParams(searchParamsString);
      next.delete("taskId");
      setSearchParams(next, { replace: true });
    }
  }, [
    taskIdFromQuery,
    tasks,
    handleOpenPreview,
    setSearchParams,
    searchParamsString,
  ]);

  const summary = useMemo(() => {
    return tasks.reduce(
      (acc, task) => {
        const statusKey = deriveDisplayStatus(task);
        acc[statusKey] = (acc[statusKey] || 0) + 1;
        return acc;
      },
      { pending: 0, verified: 0, failed: 0 }
    );
  }, [tasks]);

  // Apply the selected status tab on the client, since these are derived states.
  const visibleTasks = useMemo(() => {
    if (filters.status === "all") return tasks;
    return tasks.filter((task) => deriveDisplayStatus(task) === filters.status);
  }, [tasks, filters.status]);

  const renderActions = (task) => (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => handleOpenPreview(task)}>
        View document
      </Button>
      {task.applicantId && (
        <Button
          variant="ghost"
          size="sm"
          className="text-neutral-700 hover:text-primary"
          onClick={() => navigate(`/admin/applicants/${task.applicantId}`)}
        >
          Open profile
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="text-rose-600 hover:text-rose-700"
        onClick={() => handleDeleteTask(task)}
      >
        Delete
      </Button>
    </div>
  );

  const renderTableBody = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={5} className="py-12 text-center">
            <Loading size="md" text="Loading tasks..." />
          </td>
        </tr>
      );
    }

    if (error) {
      return (
        <tr>
          <td colSpan={5} className="py-8 text-center text-sm text-rose-600">
            {error}
          </td>
        </tr>
      );
    }

    if (!visibleTasks.length) {
      return (
        <tr>
          <td colSpan={5} className="py-12 text-center text-sm text-neutral-500">
            No tasks found for the selected filters.
          </td>
        </tr>
      );
    }

    return visibleTasks.map((task) => {
      const timestamp = task.uploadTimestamp || task.createdAt;
      const detected = task.verificationDetectedType;
      const confidence =
        typeof task.verificationConfidence === "number"
          ? `${Math.round(task.verificationConfidence * 100)}%`
          : "—";
      return (
        <tr key={task.id} className="border-t border-neutral-100">
          <td className="px-4 py-4 align-top">
            <p className="font-semibold text-neutral-900">
              {task.applicantName || "Applicant"}
            </p>
            <p className="text-xs text-neutral-500">
              {task.applicantAiKey ? `AI Key: ${task.applicantAiKey}` : ""}
            </p>
          </td>
          <td className="px-4 py-4 align-top">
            <p className="font-medium text-neutral-900">{task.documentField}</p>
            {detected && (
              <p className="text-xs text-neutral-500">Detected: {detected}</p>
            )}
            {task.verificationReason && (
              <p className="mt-1 text-xs text-neutral-500">
                {task.verificationReason}
              </p>
            )}
          </td>
          <td className="px-4 py-4 align-top text-sm text-neutral-600">
            {timestamp ? new Date(timestamp).toLocaleString() : "—"}
            <p className="text-xs text-neutral-500">Confidence: {confidence}</p>
          </td>
          <td className="px-4 py-4 align-top">
            <VerificationBadge
              status={task.verificationStatus || task.status}
              reason={task.verificationReason}
            />
          </td>
          <td className="px-4 py-4 align-top">{renderActions(task)}</td>
        </tr>
      );
    });
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-8 px-4 sm:px-6 lg:px-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">
              Ops center
            </p>
            <h1 className="text-3xl font-bold text-neutral-900">Tasks</h1>
            <p className="text-sm text-neutral-600">
              Monitor AI document verification follow-ups in one place.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-center">
              <p className="text-xs text-neutral-500">Pending</p>
              <p className="text-lg font-semibold text-neutral-900">
                {summary.pending || 0}
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-center">
              <p className="text-xs text-neutral-500">Verified</p>
              <p className="text-lg font-semibold text-neutral-900">
                {summary.verified || 0}
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-center">
              <p className="text-xs text-neutral-500">Failed</p>
              <p className="text-lg font-semibold text-neutral-900">
                {summary.failed || 0}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchTasks()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <Card.Header>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {statusFilters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => handleFilterChange("status", filter.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      filters.status === filter.value
                        ? "bg-neutral-900 text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="-mx-6 -my-5 overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Applicant</th>
                    <th className="px-4 py-3 text-left">Document</th>
                    <th className="px-4 py-3 text-left">Uploaded</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {renderTableBody()}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
      </div>
      {viewingDoc && (
        <DocumentViewer
          document={viewingDoc}
          onClose={() => setViewingDoc(null)}
          onVerify={
            viewingDoc.file ? () => handleVerifyFile(viewingDoc.file) : undefined
          }
          verifying={verifyingFileId === viewingDoc.fileId}
          onReject={
            viewingDoc.file
              ? (reason) => handleRejectFile(viewingDoc.file, reason)
              : undefined
          }
          rejecting={rejectingFileId === viewingDoc.fileId}
        />
      )}
      <UploadedFilesModal
        open={previewModal.open}
        documentName={previewModal.doc?.name}
        files={previewModal.files || []}
        loading={previewModal.loading}
        onClose={handlePreviewClose}
        onViewFile={(file) => openPreviewFile(file)}
        onDownloadFile={(file) => handleDownloadFile(file)}
        canVerify={Boolean(previewModal.doc)}
        onVerifyFile={handleVerifyFile}
        verifyingFileId={verifyingFileId}
        onRejectFile={handleRejectFile}
        rejectingFileId={rejectingFileId}
      />
    </AdminLayout>
  );
};

export default TasksPage;
