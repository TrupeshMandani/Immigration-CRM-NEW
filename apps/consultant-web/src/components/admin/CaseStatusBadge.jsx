const STATUS_STYLES = {
  open:        "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  submitted:   "bg-purple-100 text-purple-700",
  approved:    "bg-green-100 text-green-700",
  rejected:    "bg-red-100 text-red-700",
  closed:      "bg-gray-100 text-gray-600",
};

const STATUS_LABELS = {
  open:        "Open",
  in_progress: "In Progress",
  submitted:   "Submitted",
  approved:    "Approved",
  rejected:    "Rejected",
  closed:      "Closed",
};

export function CaseStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default CaseStatusBadge;
