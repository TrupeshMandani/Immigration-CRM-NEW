const URGENCY_STYLES = {
  overdue:  "bg-red-100 text-red-800 ring-1 ring-red-300",
  critical: "bg-orange-100 text-orange-800 ring-1 ring-orange-300",
  warning:  "bg-yellow-100 text-yellow-800",
  upcoming: "bg-blue-100 text-blue-700",
  future:   "bg-gray-100 text-gray-600",
};

const URGENCY_LABELS = {
  overdue:  "Overdue",
  critical: "Critical",
  warning:  "Due Soon",
  upcoming: "Upcoming",
  future:   "Future",
};

export default function DeadlineUrgencyBadge({ urgency }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        URGENCY_STYLES[urgency] ?? URGENCY_STYLES.future
      }`}
    >
      {URGENCY_LABELS[urgency] ?? urgency}
    </span>
  );
}
