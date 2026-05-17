import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { studentService } from "../../services/authService";
import StudentLayout from "../../components/layout/StudentLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StudentJourneyWorkflow from "../../components/student/StudentJourneyFlow";
import { mapFilesWithDisplayName } from "../../utils/fileName";
import {
  UserCircle2,
  FolderOpen,
  ShieldCheck,
  Upload,
  FileText as FileTextIcon,
  Loader2,
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
      } catch {
        setError("Failed to load student data");
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
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
          <h1 className="text-3xl font-bold">Welcome back, {user?.username}!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Keep track of your immigration documents and profile progress.
          </p>
        </header>

        <Card>
          <CardContent className="px-2 py-4 sm:px-4">
            <StudentJourneyWorkflow
              currentStep={currentJourneyStep}
              completedSteps={completedJourneySteps}
            />
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-3">
          <StatsCard title="Documents Uploaded" value={documentsUploaded} icon="folder" />
          <StatsCard title="Profile Fields Captured" value={extractedFields} icon="list" />
          <StatsCard title="Last Updated" value={lastUpdated} icon="clock" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="h-full">
            <CardHeader>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Quick Actions
              </p>
              <CardTitle className="text-lg">Stay on top of your tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.label} to={action.to} className="group">
                      <div className="flex h-full items-center gap-4 rounded-2xl border bg-card px-4 py-3 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="text-sm font-semibold">{action.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {action.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="flex h-full flex-col">
            <CardHeader>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Recent Documents
              </p>
              <CardTitle className="text-lg">Latest uploads</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              {files.length ? (
                files.slice(0, 4).map((file) => (
                  <div
                    key={file.id || file.name}
                    className="flex items-center gap-4 rounded-2xl border px-4 py-3"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <FileTextIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(file.updatedAt || file.createdAt)}
                      </p>
                    </div>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      View
                    </a>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed py-8 text-center text-sm text-muted-foreground">
                  You haven't uploaded any documents yet.
                </div>
              )}
              {files.length > 4 && (
                <p className="text-xs text-muted-foreground">
                  +{files.length - 4} more in your library
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link to="/student/documents">Go to Documents</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
};

const ICON_PATHS = {
  folder: "M4 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V7z",
  list: "M9 12h6m-6 4h6M4 7h16",
  clock: "M12 8v4l3 3M21 12A9 9 0 113 12a9 9 0 0118 0z",
};

const StatsCard = ({ title, value, icon }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={ICON_PATHS[icon]} />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default StudentDashboard;
