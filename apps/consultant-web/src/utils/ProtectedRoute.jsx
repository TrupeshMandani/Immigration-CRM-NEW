import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({
  children,
  requireAdmin = false,
  requireStudent = false,
}) => {
  const { isAuthenticated, isAdmin, isStudent, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireStudent && !isStudent) {
    return <Navigate to="/" replace />;
  }

  if (requireStudent && user?.status && user.status !== "active") {
    const allowedPrefixes = [
      "/student/profile",
      "/student/university-recommendations",
      "/student/change-password",
    ];

    const isAllowed = allowedPrefixes.some((prefix) =>
      location.pathname.startsWith(prefix)
    );

    if (!isAllowed) {
      return (
        <Navigate
          to="/student/university-recommendations"
          state={{ from: location }}
          replace
        />
      );
    }
  }

  if (
    requireStudent &&
    user?.isFirstLogin &&
    location.pathname !== "/student/change-password"
  ) {
    return (
      <Navigate to="/student/change-password" state={{ from: location }} replace />
    );
  }

  return children;
};

export default ProtectedRoute;
