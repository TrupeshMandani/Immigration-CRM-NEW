import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import StudentLayout from "../../components/layout/StudentLayout";
import Card from "../../components/common/Card";
import DocumentUpload from "../../components/student/DocumentUpload";
import DocumentManager from "../../components/student/DocumentManager";
import Toast from "../../components/common/Toast";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import RequiredDocuments from "../../components/student/RequiredDocuments"; // ✅ ADD THIS IMPORT

const Documents = () => {
  const { user } = useAuth();
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = (result) => {
    setToast({
      show: true,
      message: `Successfully uploaded ${
        result.uploaded?.length || 0
      } files and extracted ${result.extractedFields || 0} profile fields!`,
      type: "success",
    });
    setRefreshKey((prev) => prev + 1);
    localStorage.setItem("profile_updated", Date.now().toString());
  };

  const handleUploadError = (error) => {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Upload failed. Please try again.";
    setToast({
      show: true,
      message: message,
      type: "error",
    });
  };

  const closeToast = () => setToast((prev) => ({ ...prev, show: false }));

  return (
    <StudentLayout>
      <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary-900">My Documents</h1>
          <p className="text-primary-600 mt-2">
            Upload and manage your immigration documents
          </p>
        </div>

        <div className="space-y-8">
          {/* ✅ NEW SECTION: Required Documents */}
          <Card>
            <Card.Header>
              <h2 className="text-xl font-semibold text-primary-900">Required Documents</h2>
              <p className="text-sm text-primary-600 mt-1">
                View which documents are required for your application
              </p>
            </Card.Header>
            <Card.Body>
              <RequiredDocuments aiKey={user?.aiKey} />
            </Card.Body>
          </Card>

          {/* Upload Documents */}
          <Card>
            <Card.Header>
              <h2 className="text-xl font-semibold text-primary-900">Upload Documents</h2>
              <p className="text-sm text-primary-600 mt-1">
                Upload your immigration documents for AI processing and secure
                storage
              </p>
            </Card.Header>
            <Card.Body>
              <DocumentUpload
                aiKey={user?.aiKey}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                maxFiles={20}
              />
            </Card.Body>
          </Card>

          {/* Document Manager */}
          <Card>
            <Card.Header>
              <h2 className="text-xl font-semibold text-primary-900">Document Library</h2>
              <p className="text-sm text-primary-600 mt-1">
                View and manage all your uploaded documents
              </p>
            </Card.Header>
            <Card.Body>
              <ErrorBoundary
                fallbackMessage="Failed to load documents. Please try refreshing the page."
                showRetry={true}
              >
                <DocumentManager
                  key={refreshKey}
                  aiKey={user?.aiKey}
                  showCategories={true}
                  showSearch={true}
                  showFilters={true}
                />
              </ErrorBoundary>
            </Card.Body>
          </Card>

          {/* Upload Guidelines */}
          <Card>
            <Card.Header>
              <h3 className="text-lg font-semibold text-primary-900">Upload Guidelines</h3>
            </Card.Header>
            <Card.Body>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-primary-900 mb-2">
                    Supported File Types
                  </h4>
                  <ul className="text-sm text-primary-600 space-y-1">
                    <li>• PDF documents (.pdf)</li>
                    <li>• Images (.jpg, .jpeg, .png)</li>
                    <li>• Word documents (.doc, .docx)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-primary-900 mb-2">
                    File Requirements
                  </h4>
                  <ul className="text-sm text-primary-600 space-y-1">
                    <li>• Maximum file size: 10MB per file</li>
                    <li>• Maximum files per upload: 20</li>
                    <li>• Clear, readable documents work best</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 bg-primary-50 border border-primary-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-primary-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-primary-900">
                      AI Processing
                    </h4>
                    <p className="text-sm text-primary-700 mt-1">
                      Your documents will be automatically processed by AI to
                      extract important information like personal details,
                      education history, work experience, and more. This
                      information will be added to your profile for easy access.
                    </p>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>

      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={closeToast}
      />
    </StudentLayout>
  );
};

export default Documents;
