import { useNavigate } from "react-router-dom";
import { CaseStatusBadge } from "./CaseStatusBadge";
import { CaseTypeBadge } from "./CaseTypeBadge";
import Button from "../common/Button";

const CaseCard = ({ caseRecord, onDelete }) => {
  const navigate = useNavigate();

  const handleNavigate = () => navigate(`/admin/cases/${caseRecord.id}`);
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleNavigate(); }
  };

  const createdAt = caseRecord.created_at
    ? new Date(caseRecord.created_at).toLocaleDateString()
    : "Unknown";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleNavigate}
      onKeyDown={handleKeyDown}
      className="group relative flex cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-mono text-gray-400 mb-1">
            {caseRecord.matter_number ?? "—"}
          </p>
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {caseRecord.title}
          </h3>
        </div>
        <CaseStatusBadge status={caseRecord.status} />
      </div>

      {/* Badges */}
      <div className="mt-3">
        <CaseTypeBadge caseType={caseRecord.case_type} />
      </div>

      {/* Meta */}
      <div className="mt-4 space-y-1.5 text-sm text-gray-500">
        {caseRecord.assigned_to && (
          <div className="flex items-center gap-2">
            <PersonIcon />
            <span className="truncate">Assigned: {caseRecord.assigned_to}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <CalendarIcon />
          <span>Created {createdAt}</span>
        </div>
      </div>

      {/* Footer actions */}
      {onDelete && (
        <div className="mt-5 flex justify-end border-t border-gray-100 pt-4">
          <Button
            variant="danger"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onDelete(caseRecord.id); }}
          >
            Delete
          </Button>
        </div>
      )}
    </div>
  );
};

export default CaseCard;

const PersonIcon = () => (
  <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
