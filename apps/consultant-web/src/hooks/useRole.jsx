import { useAuth } from "../context/AuthContext";

const ROLE_PERMISSIONS = {
  "delete:applicant": ["admin", "senior"],
  "create:applicant": ["admin", "senior", "junior"],
  "view:applicant": ["admin", "senior", "junior"],
  "manage:billing": ["admin", "senior"],
};

export const useRole = () => {
  const { user } = useAuth();
  const role = user?.role ?? null;

  return {
    role,
    isAdmin: role === "admin",
    isSenior: role === "senior",
    isJunior: role === "junior",
    isApplicant: role === "applicant",
    can: (action) => ROLE_PERMISSIONS[action]?.includes(role) ?? false,
  };
};
