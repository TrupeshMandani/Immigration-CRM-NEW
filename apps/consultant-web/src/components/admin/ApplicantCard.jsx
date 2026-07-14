import { useNavigate } from "react-router-dom";
import Button from "../common/Button";
import { StatusBadge } from "../common/StatusBadge";

const ApplicantCard = ({ applicant }) => {
  const navigate = useNavigate();

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "text-red-600 font-semibold";
      case "medium":
        return "text-amber-600 font-medium";
      case "low":
        return "text-green-600 font-medium";
      default:
        return "text-gray-600";
    }
  };

  // --- Derived fields ---
  const name = applicant.contactInfo?.name || applicant.username || "Unknown Applicant";
  const email = applicant.contactInfo?.email || applicant.email || "No email";
  const phone = applicant.contactInfo?.phone || "N/A";
  const joined = applicant.createdAt
    ? new Date(applicant.createdAt).toLocaleDateString()
    : "Unknown";
  const applications = applicant.applications?.length || 0;

  const handleNavigate = () => {
    navigate(`/admin/applicants/${applicant.id}`);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleNavigate();
    }
  };

  const stopPropagation = (event) => {
    event.stopPropagation();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleNavigate}
      onKeyDown={handleKeyDown}
      className="group relative flex cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* ---------- Header ---------- */}
      <div className="flex items-start justify-between">
        {/* Left: Avatar + name */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-blue-100 text-lg font-semibold text-blue-600 ring-1 ring-blue-200">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
            <p className="text-sm text-gray-500 break-all">{email}</p>
          </div>
        </div>

        {/* Right: Status + Priority */}
        <div className="flex flex-col items-end space-y-1">
          <StatusBadge status={applicant.status} />
          {applicant.priority && (
            <span className={`text-xs ${getPriorityColor(applicant.priority)}`}>
              {applicant.priority.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* ---------- Info Section ---------- */}
      <div className="mt-5 space-y-2 text-sm text-gray-600">
        <InfoRow
          icon={
            <UserIcon />
          }
          label={`Applicant ID: ${applicant.aiKey || applicant.id || "N/A"}`}
        />

        <InfoRow
          icon={<PhoneIcon />}
          label={`Phone: ${phone}`}
        />

        <InfoRow
          icon={<CalendarIcon />}
          label={`Joined: ${joined}`}
        />

        {applications > 0 && (
          <InfoRow
            icon={<DocIcon />}
            label={`${applications} Application${applications > 1 ? "s" : ""}`}
          />
        )}
      </div>

      {/* ---------- Actions ---------- */}
      <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={stopPropagation}>
            Message
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApplicantCard;

/* ---------- Small reusable subcomponents ---------- */
const InfoRow = ({ icon, label }) => (
  <div className="flex items-center gap-2">
    <span className="text-gray-400">{icon}</span>
    <span>{label}</span>
  </div>
);

/* ---------- SVG Icons ---------- */
const UserIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

const PhoneIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const DocIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);
