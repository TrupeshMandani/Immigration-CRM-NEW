// Single source of truth for applicant lifecycle statuses: label, colors, icon
// and a plain-language description. Consumed by the StatusBadge / StatusGlossary
// components so display and glossary never drift apart.

export const APPLICANT_STATUS_META = {
  pending: {
    label: "Pending lead",
    icon: "🕒",
    badgeClass: "bg-amber-100 text-amber-700",
    dotClass: "bg-amber-500",
    description:
      "A new contact-form lead. Awaiting an advisor to reach out and send an invitation.",
  },
  registered: {
    label: "Registered (restricted)",
    icon: "✉️",
    badgeClass: "bg-sky-100 text-sky-700",
    dotClass: "bg-sky-500",
    description:
      "Invited with restricted access. Can sign in, but premium sections stay hidden until fully activated.",
  },
  active: {
    label: "Active (full access)",
    icon: "✅",
    badgeClass: "bg-emerald-100 text-emerald-700",
    dotClass: "bg-emerald-500",
    description: "A fully onboarded client with complete access to the portal.",
  },
  passed: {
    label: "Passed",
    icon: "🎓",
    badgeClass: "bg-indigo-100 text-indigo-700",
    dotClass: "bg-indigo-500",
    description: "The applicant's file was successfully passed / completed.",
  },
  rejected: {
    label: "Rejected",
    icon: "⛔",
    badgeClass: "bg-rose-100 text-rose-700",
    dotClass: "bg-rose-500",
    description: "The application was rejected and is no longer being progressed.",
  },
  closed: {
    label: "Closed",
    icon: "💤",
    badgeClass: "bg-slate-100 text-slate-600",
    dotClass: "bg-slate-400",
    description: "Account deactivated (soft-deleted). The applicant can no longer sign in.",
  },
};

// The order statuses are shown in the glossary / filters.
export const APPLICANT_STATUS_ORDER = [
  "pending",
  "registered",
  "active",
  "passed",
  "rejected",
  "closed",
];

// Legacy/UI aliases → canonical key.
const STATUS_ALIASES = { inactive: "closed" };

export const normalizeStatus = (status) => {
  const key = (status || "").toLowerCase();
  return STATUS_ALIASES[key] || key;
};

export const getStatusMeta = (status) => {
  const key = normalizeStatus(status);
  return (
    APPLICANT_STATUS_META[key] || {
      label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown",
      icon: "•",
      badgeClass: "bg-gray-100 text-gray-600",
      dotClass: "bg-gray-400",
      description: "",
    }
  );
};
