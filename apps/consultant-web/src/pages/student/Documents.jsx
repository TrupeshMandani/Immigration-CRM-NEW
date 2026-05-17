import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import StudentLayout from "../../components/layout/StudentLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import DocumentUpload from "../../components/student/DocumentUpload";
import DocumentManager from "../../components/student/DocumentManager";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import RequiredDocuments from "../../components/student/RequiredDocuments";
import { toast } from "sonner";

const Documents = () => {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = (result) => {
    toast.success(
      `Uploaded ${result.uploaded?.length || 0} file(s) · ${result.extractedFields || 0} profile fields extracted.`
    );
    setRefreshKey((prev) => prev + 1);
    localStorage.setItem("profile_updated", Date.now().toString());
  };

  const handleUploadError = (error) => {
    toast.error(
      error?.response?.data?.message || error?.message || "Upload failed. Please try again."
    );
  };

  return (
    <StudentLayout>
      <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-3xl font-bold">My Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload and manage your immigration documents.
          </p>
        </div>

        <div className="space-y-8">
          {/* Required Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Required Documents</CardTitle>
              <CardDescription>
                View which documents are required for your application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RequiredDocuments aiKey={user?.aiKey} />
            </CardContent>
          </Card>

          {/* Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
              <CardDescription>
                Upload your immigration documents for AI processing and secure storage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentUpload
                aiKey={user?.aiKey}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                maxFiles={20}
              />
            </CardContent>
          </Card>

          {/* Document Library */}
          <Card>
            <CardHeader>
              <CardTitle>Document Library</CardTitle>
              <CardDescription>
                View and manage all your uploaded documents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorBoundary
                fallbackMessage="Failed to load documents. Please try refreshing the page."
                showRetry
              >
                <DocumentManager
                  key={refreshKey}
                  aiKey={user?.aiKey}
                  showCategories
                  showSearch
                  showFilters
                />
              </ErrorBoundary>
            </CardContent>
          </Card>

          {/* Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <h4 className="mb-2 font-medium">Supported File Types</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• PDF documents (.pdf)</li>
                    <li>• Images (.jpg, .jpeg, .png)</li>
                    <li>• Word documents (.doc, .docx)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="mb-2 font-medium">File Requirements</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Maximum file size: 10 MB per file</li>
                    <li>• Maximum files per upload: 20</li>
                    <li>• Clear, readable documents work best</li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 rounded-lg border bg-muted/30 p-4 text-sm">
                <p className="font-medium">AI Processing</p>
                <p className="mt-1 text-muted-foreground">
                  Your documents will be automatically processed by AI to extract
                  important information like personal details, education history, work
                  experience, and more. This information will be added to your profile.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </StudentLayout>
  );
};

export default Documents;
