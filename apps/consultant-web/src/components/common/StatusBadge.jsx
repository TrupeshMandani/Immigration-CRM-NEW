import {
  APPLICANT_STATUS_META,
  APPLICANT_STATUS_ORDER,
  getStatusMeta,
} from "../../lib/applicantStatus";

// Small colored pill used anywhere an applicant status is displayed.
export const StatusBadge = ({ status, className = "" }) => {
  const meta = getStatusMeta(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.badgeClass} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
};

// A legend explaining what every status means, using the same colors/icons.
export const StatusGlossary = ({ className = "" }) => (
  <div className={className}>
    <h3 className="text-sm font-semibold text-gray-800">What the statuses mean</h3>
    <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {APPLICANT_STATUS_ORDER.map((key) => {
        const meta = APPLICANT_STATUS_META[key];
        return (
          <div key={key} className="flex items-start gap-2.5">
            <StatusBadge status={key} className="mt-0.5 shrink-0" />
            <dd className="text-xs leading-relaxed text-gray-500">{meta.description}</dd>
          </div>
        );
      })}
    </dl>
  </div>
);

export default StatusBadge;
