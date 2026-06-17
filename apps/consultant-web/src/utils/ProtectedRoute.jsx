import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({
  children,
  requireAdmin = false,
  requireApplicant = false,
}) => {
  const { isAuthenticated, isAdmin, isApplicant, loading, user } = useAuth();
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

  if (requireApplicant && !isApplicant) {
    return <Navigate to="/" replace />;
  }

  if (requireApplicant && user?.status && user.status !== "active") {
    const allowedPrefixes = [
      "/applicant/profile",
      "/applicant/university-recommendations",
      "/applicant/change-password",
    ];

    const isAllowed = allowedPrefixes.some((prefix) =>
      location.pathname.startsWith(prefix)
    );

    if (!isAllowed) {
      return (
        <Navigate
          to="/applicant/university-recommendations"
          state={{ from: location }}
          replace
        />
      );
    }
  }

  if (
    requireApplicant &&
    user?.isFirstLogin &&
    location.pathname !== "/applicant/change-password"
  ) {
    return (
      <Navigate to="/applicant/change-password" state={{ from: location }} replace />
    );
  }

  return children;
};

export default ProtectedRoute;
