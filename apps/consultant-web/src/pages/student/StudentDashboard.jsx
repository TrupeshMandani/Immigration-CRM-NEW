import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { studentService } from "../../services/authService";
import StudentLayout from "../../components/layout/StudentLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import StudentJourneyWorkflow from "../../components/student/StudentJourneyFlow";
import { mapFilesWithDisplayName } from "../../utils/fileName";
import {
  UserCircle2,
  FolderOpen,
  ShieldCheck,
  Upload,
  FileText as FileTextIcon,
} from "lucide-react";

const QUICK_ACTIONS = [
  {
    label: "View Profile",
    description: "Review personal info and keep it current.",
    to: "/student/profile",
    icon: UserCircle2,
  },
  {
    label: "Manage Documents",
    description: "Upload or replace essential paperwork.",
    to: "/student/documents",
    icon: FolderOpen,
  },
  {
    label: "Change Password",
    description: "Update your security credentials.",
    to: "/student/change-password",
    icon: ShieldCheck,
  },
  {
    label: "Upload New Document",
    description: "Start a new upload session.",
    to: "/student/documents",
    icon: Upload,
  },
];

const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        if (user?.aiKey) {
          const [studentData, filesData] = await Promise.all([
            studentService.getStudentByKey(user.aiKey),
            studentService.getStudentFiles(user.aiKey),
          ]);
          setStudent(studentData);
          setFiles(mapFilesWithDisplayName(filesData.files || []));
        }
      } catch (err) {
        setError("Failed to load student data");
        console.error("Error fetching student data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [user?.aiKey]);

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex h-96 items-center justify-center">
          <Loading size="lg" text="Loading your dashboard..." />
        </div>
      </StudentLayout>
    );
  }

  const documentsUploaded = files.length;
  const extractedFields = student?.profile
    ? Object.keys(student.profile).length
    : 0;
  const lastUpdated = student?.updatedAt
    ? new Date(student.updatedAt).toLocaleDateString()
    : "Not yet";
  const currentJourneyStep = Number(student?.journeyStep) || 1;
  const completedJourneySteps = Array.isArray(student?.completedSteps)
    ? student.completedSteps
    : [];

  return (
    <StudentLayout>
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-primary-900">
            Welcome back, {user?.username}!
          </h1>
          <p className="mt-2 text-sm text-primary-600">
            Keep track of your immigration documents and profile progress.
          </p>
        </header>

        <Card className="overflow-hidden">
          <Card.Body className="px-0 py-4 sm:px-2">
            <StudentJourneyWorkflow
              currentStep={currentJourneyStep}
              completedSteps={completedJourneySteps}
            />
          </Card.Body>
        </Card>

        <div className="grid gap-6 md:grid-cols-3">
          <StatsCard
            title="Documents Uploaded"
            value={documentsUploaded}
            icon={
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V7z"
                />
              </svg>
            }
            accent="secondary"
          />
          <StatsCard
            title="Profile Fields Captured"
            value={extractedFields}
            icon={
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6M4 7h16"
                />
              </svg>
            }
            accent="primary"
          />
          <StatsCard
            title="Last Updated"
            value={lastUpdated}
            icon={
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 12A9 9 0 113 12a9 9 0 0118 0z"
                />
              </svg>
            }
            accent="success"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="h-full">
            <Card.Header>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">
                  Quick Actions
                </p>
                <h3 className="text-lg font-semibold text-primary-900">
                  Stay on top of your tasks
                </h3>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="grid gap-4 sm:grid-cols-2">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.label} to={action.to} className="group">
                      <div className="flex h-full items-center gap-4 rounded-2xl border border-primary-400/30 bg-primary-200 px-4 py-3 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary-400/60 group-hover:shadow-lg">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600/10 text-primary-600">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="text-sm font-semibold text-primary-900">
                            {action.label}
                          </p>
                          <p className="text-xs text-primary-600">
                            {action.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Card.Body>
          </Card>

          <Card className="flex h-full flex-col">
            <Card.Header>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">
                  Recent Documents
                </p>
                <h3 className="text-lg font-semibold text-primary-900">
                  Latest uploads
                </h3>
              </div>
            </Card.Header>
            <Card.Body className="flex-1 space-y-4">
              {files.length ? (
                files.slice(0, 4).map((file) => (
                  <div
                    key={file.id || file.name}
                    className="flex items-center gap-4 rounded-2xl border border-primary-400/30 px-4 py-3"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-400/20 text-primary-600">
                      <FileTextIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-primary-900">
                        {file.name}
                      </p>
                      <p className="text-xs text-primary-600">
                        {formatDate(file.updatedAt || file.createdAt)}
                      </p>
                    </div>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-primary-600 hover:text-primary-800"
                    >
                      View
                    </a>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-primary-400/30 bg-primary-200/50 py-8 text-center text-sm text-primary-600">
                  You haven't uploaded any documents yet.
                </div>
              )}
              {files.length > 4 && (
                <p className="text-xs text-primary-600">
                  +{files.length - 4} more in your library
                </p>
              )}
            </Card.Body>
            <Card.Footer>
              <Link to="/student/documents">
                <Button variant="primary" size="sm" className="w-full">
                  Go to Documents
                </Button>
              </Link>
            </Card.Footer>
          </Card>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <Card.Body>
              <p className="text-sm text-red-700">{error}</p>
            </Card.Body>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
};

const StatsCard = ({ title, value, icon, accent = "primary" }) => {
  const accentClass =
    accent === "secondary"
      ? "bg-secondary/10 text-secondary"
      : accent === "success"
      ? "bg-success/10 text-success"
      : "bg-primary-600/10 text-primary-600";

  return (
    <Card>
      <Card.Body>
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${accentClass}`}
          >
            {icon}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
              {title}
            </p>
            <p className="text-2xl font-semibold text-primary-900">{value}</p>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default StudentDashboard;
