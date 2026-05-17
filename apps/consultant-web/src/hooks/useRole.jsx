import { useAuth } from "../context/AuthContext";

const ROLE_PERMISSIONS = {
  "delete:student": ["admin", "senior"],
  "create:student": ["admin", "senior", "junior"],
  "view:student": ["admin", "senior", "junior"],
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
    isStudent: role === "student",
    can: (action) => ROLE_PERMISSIONS[action]?.includes(role) ?? false,
  };
};
