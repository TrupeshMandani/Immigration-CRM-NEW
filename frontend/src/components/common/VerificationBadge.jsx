import { AlertTriangle, CheckCircle2, Clock10 } from "lucide-react";

const statusTokens = {
  verified: {
    label: "Verified",
    icon: CheckCircle2,
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  failed: {
    label: "Failed",
    icon: AlertTriangle,
    classes: "border-rose-200 bg-rose-50 text-rose-700",
  },
  pending: {
    label: "Pending",
    icon: Clock10,
    classes: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

const VerificationBadge = ({
  status = "pending",
  reason = "",
  minimal = false,
  className = "",
}) => {
  const key = (status || "pending").toLowerCase();
  const token = statusTokens[key] || statusTokens.pending;
  const Icon = token.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none ${token.classes} ${className}`}
      title={reason || token.label}
    >
      <Icon className="h-3.5 w-3.5" />
      {minimal ? null : token.label}
    </span>
  );
};

export default VerificationBadge;
