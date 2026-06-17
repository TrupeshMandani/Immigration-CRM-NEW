import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AdminLayout from "../../components/layout/AdminLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import DocumentViewer from "../../components/applicant/DocumentViewer";
import { applicantService } from "../../services/authService";
import { uploadService } from "../../services/uploadService";
import applicantTaskService from "../../services/applicantTaskService";
import { withDisplayName } from "../../utils/fileName";
import RequiredDocumentsAdmin from "../../components/admin/RequiredDocumentsAdmin";
import { getRecommendations } from "../../services/recommendationService";
import ConfirmDialog from "../../components/common/ConfirmDialog";

const EMPTY_CONTACT = { name: "", email: "", phone: "", message: "" };

const ApplicantDetailSectionNav = ({ sections, currentHash }) => (
  <div className="border-b border-gray-200 bg-white p-1 rounded-xl shadow-sm">
    <div className="flex flex-col gap-3">
      <div className="-m-1 flex flex-wrap gap-2  overflow-x-auto px-4 py-3 sm:-m-3 sm:px-6 lg:px-8">
        {sections.map((section, index) => {
          const isActive =
            currentHash === section.id || (!currentHash && index === 0);
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={`m-1 inline-flex items-center whitespace-nowrap rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary bg-primary text-white"
                  : "border-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-100"
              }`}
            >
              {section.label}
            </a>
          );
        })}
      </div>
    </div>
  </div>
);

const ApplicantDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const location = useLocation();
  const [applicant, setApplicant] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("pending");
  const [contactInfo, setContactInfo] = useState(EMPTY_CONTACT);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    document: null,
  });
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationEnabled, setRecommendationEnabled] = useState(false);
  const [recommendationMessage, setRecommendationMessage] = useState("");
  const [recommendationError, setRecommendationError] = useState(false);
  const [recommendationSource, setRecommendationSource] = useState("openai");
  const applicantId = applicant?._id;
  const applicantAiKey = applicant?.aiKey;
  const [confirmDeleteApplicant, setConfirmDeleteApplicant] = useState(false);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState({
    open: false,
    doc: null,
  });
  const [applicantTasks, setApplicantTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskDeletingId, setTaskDeletingId] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    attachment: null,
  });
  const sectionLinks = useMemo(
    () => [
      { id: "contact", label: "Contact & Status" },
      { id: "recommendations", label: "Recommendations" },
      { id: "profile-data", label: "Profile Data" },
      { id: "required-docs", label: "Required Documents" },
      { id: "tasks", label: "Tasks" },
      { id: "documents", label: "Documents" },
      { id: "actions", label: "Actions" },
    ],
    []
  );
  const currentHash = useMemo(
    () => location.hash?.replace("#", "") || "",
    [location.hash]
  );
  const queryParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const requestedDocumentId = queryParams.get("docId");
  const fetchApplicantTasks = useCallback(async () => {
    if (!applicantAiKey) return;
    try {
      setTasksLoading(true);
      const list = await applicantTaskService.list(applicantAiKey);
      setApplicantTasks(list);
      setTaskError("");
    } catch (err) {
      console.error("Failed to load applicant tasks:", err);
      setTaskError("Unable to load tasks.");
    } finally {
      setTasksLoading(false);
    }
  }, [applicantAiKey]);

  useEffect(() => {
    if (applicantAiKey) {
      fetchApplicantTasks();
    }
  }, [applicantAiKey, fetchApplicantTasks]);
  const profileEntries = useMemo(() => {
    if (!applicant?.profile || !Object.keys(applicant.profile).length) {
      return [];
    }

    const priorityMap = {
      fullName: 1,
      firstName: 1,
      lastName: 1,
      name: 1,
      dateOfBirth: 1,
      dob: 1,
      nationality: 1,
      passportNumber: 1,
      passport: 1,
      gender: 1,
      maritalStatus: 1,
      email: 2,
      phone: 2,
      phoneNumber: 2,
      address: 2,
      city: 2,
      state: 2,
      country: 2,
      postalCode: 2,
      zipCode: 2,
      education: 3,
      degree: 3,
      university: 3,
      college: 3,
      institution: 3,
      graduationDate: 3,
      fieldOfStudy: 3,
      major: 3,
      gpa: 3,
      workExperience: 4,
      jobTitle: 4,
      company: 4,
      employer: 4,
      yearsOfExperience: 4,
      occupation: 4,
      position: 4,
      salary: 4,
      visaType: 5,
      visaStatus: 5,
      arrivalDate: 5,
      departureDate: 5,
      immigrationStatus: 5,
      travelHistory: 5,
    };

    const formatLabel = (key) =>
      key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (letter) => letter.toUpperCase())
        .trim();

    const formatValue = (value) => {
      if (Array.isArray(value)) {
        return value.join(", ");
      }
      if (typeof value === "object" && value !== null) {
        // Format objects in a readable way instead of JSON
        return Object.entries(value)
          .map(([key, val]) => `${formatLabel(key)}: ${val}`)
          .join(", ");
      }
      return value ?? "Not provided";
    };

    return Object.entries(applicant.profile)
      .sort(([keyA], [keyB]) => {
        const priorityA = priorityMap[keyA] || 999;
        const priorityB = priorityMap[keyB] || 999;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return keyA.localeCompare(keyB);
      })
      .map(([key, value]) => ({
        key,
        label: formatLabel(key),
        value: formatValue(value),
      }));
  }, [applicant?.profile]);

  const normalizeDocument = (file, index = 0) => {
    const withName = withDisplayName(file, `Document ${index + 1}`);
    const normalized = {
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
    console.log("Normalized document:", normalized);
    return normalized;
  };

  const refreshRecommendations = useCallback(async () => {
    if (!applicantId || !token) {
      return;
    }

    try {
      const data = await getRecommendations(applicantId, token);
      setRecommendations(data.universities || []);
      setRecommendationSource(data.source || "openai");
      if (typeof data.recommendationEnabled === "boolean") {
        setRecommendationEnabled(Boolean(data.recommendationEnabled));
      } else if (typeof data.enabled === "boolean") {
        setRecommendationEnabled(Boolean(data.enabled));
      }
      setRecommendationError(false);
    } catch (err) {
      if (err?.response?.status === 404 || err?.response?.status === 400) {
        setRecommendations([]);
        setRecommendationSource("openai");
        return;
      }
      console.error("Failed to load recommendations:", err);
      setRecommendationError(true);
      setRecommendationMessage(
        err?.response?.data?.message || "Unable to fetch recommendations."
      );
      setRecommendationSource("openai");
    }
  }, [applicantId, token]);

  useEffect(() => {
    const fetchApplicant = async () => {
      try {
        setLoading(true);
        setError("");
        setRecommendationMessage("");
        setRecommendationError(false);
        setRecommendations([]);
        setRecommendationEnabled(false);

        const data = await applicantService.getApplicantById(id);
        setApplicant(data);
        setStatus(data.status || "pending");
        setContactInfo({ ...EMPTY_CONTACT, ...data.contactInfo });
        const initialEnabled =
          typeof data.recommendationEnabled === "boolean"
            ? data.recommendationEnabled
            : typeof data.enabled === "boolean"
            ? data.enabled
            : false;
        setRecommendationEnabled(Boolean(initialEnabled));

        if (data.aiKey) {
          try {
            const filesResponse = await applicantService.getApplicantFiles(
              data.aiKey
            );
            const formatted = (filesResponse.files || []).map((file, index) =>
              normalizeDocument(file, index)
            );
            setDocuments(formatted);
          } catch (docsError) {
            console.error("Failed to load applicant documents:", docsError);
            setDocuments([]);
          }
        } else {
          setDocuments([]);
        }
      } catch (err) {
        console.error("Failed to load applicant:", err);
        setError(
          err.response?.data?.message || "Unable to load applicant details."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchApplicant();
  }, [id]);

  useEffect(() => {
    refreshRecommendations();
  }, [refreshRecommendations]);

  const handleContactChange = (event) => {
    const { name, value } = event.target;
    setContactInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!applicant) return;

    setSaving(true);
    setError("");

    try {
      await applicantService.updateApplicant(applicant._id, {
        status,
        contactInfo,
      });
      const refreshed = await applicantService.getApplicantById(applicant._id);
      setApplicant(refreshed);
      setStatus(refreshed.status || status);
      setContactInfo({ ...EMPTY_CONTACT, ...refreshed.contactInfo });
    } catch (err) {
      console.error("Failed to update applicant:", err);
      setError(
        err.response?.data?.message || "Failed to update applicant details."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setConfirmDeleteApplicant(true);
  };

  const doDeleteApplicant = async () => {
    setConfirmDeleteApplicant(false);
    if (!applicant) return;
    try {
      await applicantService.deleteApplicant(applicant._id);
      navigate("/admin/applicants", { replace: true });
    } catch (err) {
      console.error("Failed to delete applicant:", err);
      setError(err.response?.data?.message || "Failed to delete applicant.");
    }
  };

  const cancelDeleteApplicant = () => setConfirmDeleteApplicant(false);

  const handleDocumentClick = (document) => {
    hideContextMenu();
    // Validate document before setting it
    if (document && (document.name || document.key)) {
      setViewingDocument(document);
    } else {
      console.error("Invalid document:", document);
    }
  };

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

  const handleDownloadDocument = (doc) => {
    hideContextMenu();
    if (!doc?.url) return;
    const link = window.document.createElement("a");
    link.href = doc.url;
    link.download = doc.name || "document";
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleRenameDocument = async (doc) => {
    hideContextMenu();
    const currentName = doc?.name || "";
    const newName = window.prompt("Enter a new file name", currentName);
    if (!newName || newName.trim() === currentName) return;

    try {
      setLoading(true);
      const response = await uploadService.renameDocument(
        applicant.aiKey,
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

  const handleDeleteDocument = async (doc) => {
    hideContextMenu();
    setConfirmDeleteDoc({ open: true, doc });
  };

  const doDeleteDocument = async () => {
    const doc = confirmDeleteDoc.doc;
    setConfirmDeleteDoc({ open: false, doc: null });
    if (!doc) return;

    try {
      setLoading(true);
      await uploadService.deleteDocument(applicant.aiKey, doc.id);
      setDocuments((prev) => {
        const filtered = prev.filter(
          (item) =>
            item.id !== doc.id &&
            item.key !== doc.key &&
            item._id !== doc._id &&
            item.name !== doc.name
        );
        return filtered;
      });
      if (
        viewingDocument &&
        (viewingDocument.id === doc.id ||
          viewingDocument.key === doc.key ||
          viewingDocument.name === doc.name)
      ) {
        setViewingDocument(null);
      }
      setError("");
      setTimeout(async () => {
        try {
          const filesResponse = await uploadService.getApplicantFiles(
            applicant.aiKey
          );
          const formatted = (filesResponse.files || []).map((file, index) =>
            normalizeDocument(file, index)
          );
          setDocuments(formatted);
        } catch {
          console.error(
            "Error refreshing documents:",
            error || "Unknown error"
          );
        }
      }, 400);
    } catch (err) {
      console.error("Error deleting document:", err);
      setError(err.message || "Failed to delete document");
    } finally {
      setLoading(false);
    }
  };

  const cancelDeleteDocument = () =>
    setConfirmDeleteDoc({ open: false, doc: null });

  const handleTaskInputChange = (field, value) => {
    setTaskForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTaskAttachmentChange = (event) => {
    const file =
      event.target.files && event.target.files[0]
        ? event.target.files[0]
        : null;
    setTaskForm((prev) => ({ ...prev, attachment: file }));
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();
    if (!applicantAiKey || !taskForm.title.trim()) {
      setTaskError("Task title is required.");
      return;
    }
    setCreatingTask(true);
    setTaskError("");
    try {
      const list = await applicantTaskService.create(applicantAiKey, {
        title: taskForm.title.trim(),
        description: taskForm.description,
        dueDate: taskForm.dueDate,
        attachment: taskForm.attachment,
      });
      setApplicantTasks(list);
      setTaskForm({
        title: "",
        description: "",
        dueDate: "",
        attachment: null,
      });
    } catch (error) {
      console.error("Create task failed:", error);
      setTaskError(error?.response?.data?.message || "Unable to create task.");
    } finally {
      setCreatingTask(false);
    }
  };

  const handleDownloadTaskAttachment = async (task) => {
    if (!applicantAiKey || !task?.id) return;
    try {
      const url = await applicantTaskService.attachmentUrl(applicantAiKey, task.id);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("Failed to download task attachment:", error);
      setTaskError("Unable to download attachment.");
    }
  };

  const handleDeleteTask = async (task) => {
    if (!applicantAiKey || !task?.id) return;
    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) return;
    setTaskDeletingId(task.id);
    setTaskError("");
    try {
      const list = await applicantTaskService.delete(applicantAiKey, task.id);
      setApplicantTasks(list);
    } catch (error) {
      console.error("Failed to delete task:", error);
      setTaskError(error?.response?.data?.message || "Unable to delete task.");
    } finally {
      setTaskDeletingId(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-96 items-center justify-center">
          <Loading size="lg" text="Loading applicant details..." />
        </div>
      </AdminLayout>
    );
  }

  if (!applicant) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <Card>
            <Card.Body>
              <p className="text-center text-gray-600">
                Applicant not found.{" "}
                <Link
                  to="/admin/applicants"
                  className="text-primary hover:text-blue-700"
                >
                  Return to applicants
                </Link>
                .
              </p>
            </Card.Body>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      topbar={
        <ApplicantDetailSectionNav
          sections={sectionLinks}
          currentHash={currentHash}
        />
      }
    >
      <div className="mx-auto max-w-6xl space-y-8 px-4  sm:px-6 lg:px-8">
        <section id="overview">
          <Link
            to="/admin/applicants"
            className="text-sm font-medium text-primary hover:text-blue-700"
          >
            ← Back to applicants
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-gray-900">
            {applicant.contactInfo?.name || applicant.username || "Unnamed Applicant"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Created on{" "}
            {applicant.createdAt
              ? new Date(applicant.createdAt).toLocaleDateString()
              : "Unknown"}
          </p>
        </section>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <Card.Body>
              <p className="text-sm text-red-700">{error}</p>
            </Card.Body>
          </Card>
        )}

        <section id="contact" className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <Card.Header>
              <h2 className="text-xl font-semibold">
                Account & Contact Details
              </h2>
            </Card.Header>
            <Card.Body>
              <form className="space-y-6" onSubmit={handleSave}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(event) => setStatus(event.target.value)}
                      className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Username
                    </label>
                    <input
                      value={applicant.username || "Not assigned"}
                      readOnly
                      className="mt-2 w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Contact Name
                    </label>
                    <input
                      name="name"
                      value={contactInfo.name}
                      onChange={handleContactChange}
                      className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Contact Email
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={contactInfo.email}
                      onChange={handleContactChange}
                      className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Phone
                    </label>
                    <input
                      name="phone"
                      value={contactInfo.phone}
                      onChange={handleContactChange}
                      className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      AI Key
                    </label>
                    <input
                      value={applicant.aiKey || "Not generated"}
                      readOnly
                      className="mt-2 w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600 shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    name="message"
                    rows={4}
                    value={contactInfo.message}
                    onChange={handleContactChange}
                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Add or update notes about this applicant..."
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={saving}
                    disabled={saving}
                  >
                    Save changes
                  </Button>
                </div>
              </form>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <h2 className="text-xl font-semibold">Account Summary</h2>
            </Card.Header>
            <Card.Body className="space-y-4 text-sm text-gray-600">
              <div className="flex justify-between">
                <span className="font-medium text-gray-900">Status</span>
                <span className="capitalize">{applicant.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-900">
                  First Login Pending
                </span>
                <span>{applicant.isFirstLogin ? "Yes" : "No"}</span>
              </div>
              <div>
                <span className="font-medium text-gray-900">Email</span>
                <p className="mt-1 break-all">
                  {applicant.email || "Not assigned"}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-900">Last Updated</span>
                <p className="mt-1">
                  {applicant.updatedAt
                    ? new Date(applicant.updatedAt).toLocaleString()
                    : "Unknown"}
                </p>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-900">
                  Profile Complete
                </span>
                <span>{applicant.profileComplete ? "Yes" : "No"}</span>
              </div>
            </Card.Body>
          </Card>
        </section>

        <section id="recommendations">
          <Card>
            <Card.Header>
              <h2 className="text-xl font-semibold">
                AI University Recommendations
              </h2>
              <p className="text-sm text-gray-500">
                Manage automated university suggestions for this applicant.
              </p>
            </Card.Header>
            <Card.Body className="space-y-4">
              {recommendationMessage && (
                <p
                  className={`text-sm ${
                    recommendationError ? "text-red-600" : "text-gray-600"
                  }`}
                >
                  {recommendationMessage}
                </p>
              )}
              {recommendations.length > 0 && (
                <p className="text-xs text-gray-500">
                  Source:{" "}
                  {recommendationSource === "openai"
                    ? "AI-generated suggestions"
                    : "Fallback recommendations (AI unavailable)"}
                </p>
              )}

              {recommendationEnabled ? (
                recommendations.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {recommendations.map((uni, index) => (
                      <div
                        key={`${
                          uni.id || uni.name || "recommendation"
                        }-${index}`}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm"
                      >
                        <h3 className="font-semibold text-gray-800">
                          {uni.name || "Unnamed University"}
                        </h3>
                        {uni.program && (
                          <p className="text-sm text-gray-600">{uni.program}</p>
                        )}
                        {uni.country && (
                          <p className="text-xs text-gray-500">{uni.country}</p>
                        )}
                        {uni.eligibilityReason && (
                          <p className="mt-2 text-xs text-gray-500">
                            {uni.eligibilityReason}
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between text-xs font-medium text-gray-700">
                          <span>
                            💰{" "}
                            {typeof uni.tuitionFee === "number"
                              ? `$${uni.tuitionFee.toLocaleString()}`
                              : uni.tuitionFee || "N/A"}
                          </span>
                          <span className="text-blue-600">
                            {typeof uni.aiScore === "number"
                              ? `${(uni.aiScore * 100).toFixed(0)}%`
                              : "N/A"}
                          </span>
                        </div>
                        {uni.website && (
                          <a
                            href={uni.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-block text-xs font-medium text-blue-600 hover:underline"
                          >
                            Visit Program →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No recommendations available for this applicant yet.
                  </p>
                )
              ) : (
                <p className="text-sm text-gray-500">
                  Recommendations are currently disabled for this applicant.
                </p>
              )}
            </Card.Body>
          </Card>
        </section>

        <section id="profile-data">
          <Card>
            <Card.Header>
              <h2 className="text-xl font-semibold">Profile Data</h2>
            </Card.Header>
            <Card.Body>
              {profileEntries.length ? (
                <div className="grid gap-6 sm:grid-cols-2">
                  {profileEntries.map((entry) => (
                    <div key={entry.label}>
                      <p className="text-sm font-medium text-gray-500">
                        {entry.label}
                      </p>
                      <p className="mt-1 text-sm text-gray-900">
                        {entry.value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No profile data captured yet. Once documents are processed,
                  extracted data will appear here.
                </p>
              )}
            </Card.Body>
          </Card>
        </section>

        {/* Required Documents Section */}
        <section id="required-docs">
          <Card>
            <Card.Header>
              <h2 className="text-xl font-semibold">Required Documents</h2>
            </Card.Header>
            <Card.Body>
              <RequiredDocumentsAdmin
                aiKey={applicant.aiKey}
                autoOpenDocumentId={requestedDocumentId}
              />
            </Card.Body>
          </Card>
        </section>

        <section id="tasks">
          <Card>
            <Card.Header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Applicant Tasks</h2>
                <p className="text-sm text-gray-500">
                  Assign custom follow-ups or reminders for this applicant.
                </p>
              </div>
            </Card.Header>
            <Card.Body>
              <form onSubmit={handleCreateTask} className="space-y-4">
                {taskError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                    {taskError}
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={taskForm.title}
                      onChange={(event) =>
                        handleTaskInputChange("title", event.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="e.g., Upload IELTS results"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(event) =>
                        handleTaskInputChange("dueDate", event.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={taskForm.description}
                    onChange={(event) =>
                      handleTaskInputChange("description", event.target.value)
                    }
                    className="mt-1 min-h-[100px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Provide details or instructions for this task"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Attachment (optional)
                  </label>
                  <input
                    type="file"
                    onChange={handleTaskAttachmentChange}
                    className="mt-1 w-full text-sm text-gray-600"
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={creatingTask}>
                    {creatingTask ? "Assigning..." : "Assign Task"}
                  </Button>
                </div>
              </form>

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900">
                  Existing Tasks
                </h3>
                {tasksLoading ? (
                  <div className="py-6">
                    <Loading size="sm" text="Loading tasks..." />
                  </div>
                ) : applicantTasks.length ? (
                  <div className="mt-4 space-y-4">
                    {applicantTasks.map((task) => (
                      <div
                        key={task.id}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-base font-semibold text-gray-900">
                              {task.title}
                            </p>
                            {task.dueDate && (
                              <p className="text-sm text-gray-500">
                                Due{" "}
                                {new Date(task.dueDate).toLocaleDateString()}
                              </p>
                            )}
                            {task.description && (
                              <p className="mt-2 text-sm text-gray-700">
                                {task.description}
                              </p>
                            )}
                            {task.attachment && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadTaskAttachment(task)
                                }
                                className="mt-3 text-sm font-medium text-primary hover:text-primary/80"
                              >
                                Download attachment
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                task.status === "completed"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {task.status === "completed"
                                ? "Completed"
                                : "Pending"}
                            </span>
                            <span>
                              Assigned {new Date(task.assignedAt).toLocaleDateString()}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:text-rose-700"
                              onClick={() => handleDeleteTask(task)}
                              disabled={taskDeletingId === task.id}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gray-500">
                    No tasks have been assigned to this applicant yet.
                  </p>
                )}
              </div>
            </Card.Body>
          </Card>
        </section>

        <section id="documents">
          <Card>
            <Card.Header>
              <h2 className="text-xl font-semibold">Documents</h2>
            </Card.Header>
            <Card.Body>
              {documents.length ? (
                <div className="space-y-3">
                  {documents.map((file, index) => (
                    <div
                      key={file.id || file.key || file.name || `doc-${index}`}
                      onClick={() => handleDocumentClick(file)}
                      onContextMenu={(event) => showContextMenu(event, file)}
                      className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="truncate font-medium text-gray-900">
                          {file.name}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {file.mimeType} •{" "}
                          {file.size
                            ? `${Math.round(file.size / 1024)} KB`
                            : "Unknown size"}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <span className="text-xs text-gray-500">
                          Click to view
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No documents available yet. Uploads completed by the applicant
                  will appear here automatically.
                </p>
              )}
            </Card.Body>
          </Card>
        </section>

        <section id="actions">
          <Card className="border-red-200">
            <Card.Body className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-red-600">
                  Delete Applicant
                </h3>
                <p className="text-sm text-gray-600">
                  Removing an applicant will revoke their access and delete
                  their record.
                </p>
              </div>
              <Button variant="danger" onClick={handleDelete}>
                Delete Applicant
              </Button>
            </Card.Body>
          </Card>
        </section>
      </div>

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
            onClick={() => handleDownloadDocument(contextMenu.document)}
          >
            Download
          </button>
          <button
            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => handleRenameDocument(contextMenu.document)}
          >
            Rename
          </button>
          <button
            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={() => handleDeleteDocument(contextMenu.document)}
          >
            Delete
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteApplicant}
        title="Delete applicant?"
        description="Are you sure you want to delete this applicant? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={doDeleteApplicant}
        onCancel={cancelDeleteApplicant}
      />

      <ConfirmDialog
        open={confirmDeleteDoc.open}
        title="Delete document?"
        description={
          confirmDeleteDoc.doc
            ? `Are you sure you want to delete "${confirmDeleteDoc.doc.name}" for this applicant?`
            : "Are you sure you want to delete this document?"
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={doDeleteDocument}
        onCancel={cancelDeleteDocument}
      />
    </AdminLayout>
  );
};

export default ApplicantDetailPage;
