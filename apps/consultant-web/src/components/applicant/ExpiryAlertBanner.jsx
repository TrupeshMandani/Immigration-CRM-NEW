import { useEffect, useState } from "react";
import { useSocket } from "../../hooks/useSocket";
import { AlertTriangle, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(target.getTime())) return null;
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function extractExpiryFromProfile(profileData) {
  if (!profileData) return null;
  const candidates = [
    profileData.ExpiryDate,
    profileData.expiryDate,
    profileData.passportDetails?.expiryDate,
  ];
  for (const v of candidates) {
    if (v && typeof v === "string" && /\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  }
  return null;
}

const ExpiryAlertBanner = ({ applicant }) => {
  const { socket } = useSocket() || {};
  const [expiryInfo, setExpiryInfo] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  // Derive from applicant profile on mount
  useEffect(() => {
    if (!applicant?.profile_data) return;
    const expiryDate = extractExpiryFromProfile(applicant.profile_data);
    if (!expiryDate) return;
    const days = getDaysUntil(expiryDate);
    if (days !== null && days <= 180) {
      setExpiryInfo({ documentType: "Passport", expiryDate, daysRemaining: days });
    }
  }, [applicant]);

  // Also listen for real-time push (when socket fires during session)
  useEffect(() => {
    if (!socket) return;
    const handle = (data) => {
      const days = getDaysUntil(data.expiryDate);
      if (days !== null && days <= 180) {
        setExpiryInfo({ ...data, daysRemaining: days });
        setDismissed(false);
      }
    };
    socket.on("document:expiring", handle);
    return () => socket.off("document:expiring", handle);
  }, [socket]);

  if (!expiryInfo || dismissed) return null;

  const { documentType, expiryDate, daysRemaining } = expiryInfo;
  const isOverdue = daysRemaining < 0;
  const isUrgent = daysRemaining <= 30;

  const colorClass = isOverdue
    ? "border-red-300 bg-red-50 text-red-800"
    : isUrgent
    ? "border-orange-300 bg-orange-50 text-orange-800"
    : "border-yellow-300 bg-yellow-50 text-yellow-800";

  const iconClass = isOverdue
    ? "text-red-500"
    : isUrgent
    ? "text-orange-500"
    : "text-yellow-500";

  const message = isOverdue
    ? `Your ${documentType} expired on ${formatDate(expiryDate)}. Renewal is required before proceeding.`
    : `Your ${documentType} expires in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} (${formatDate(expiryDate)}). Renew before applying to avoid delays.`;

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 ${colorClass}`}>
      <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-0.5 hover:bg-black/10"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default ExpiryAlertBanner;
