import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "../context/AuthContext";

const Forbidden = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isStudent } = useAuth();

  const homePath = isAdmin
    ? "/admin/dashboard"
    : isStudent
    ? "/student/dashboard"
    : "/";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-6xl font-bold text-primary">403</p>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">
          Access Denied
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {user
            ? "You don't have permission to access this page."
            : "You need to be signed in to view this page."}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => navigate(-1)} variant="outline">
            Go Back
          </Button>
          <Button asChild>
            <Link to={homePath}>Go Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Forbidden;
