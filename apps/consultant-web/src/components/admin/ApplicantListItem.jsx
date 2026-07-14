import { useNavigate } from "react-router-dom";
import Button from "../common/Button";
import { StatusBadge } from "../common/StatusBadge";

const ApplicantListItem = ({ applicant }) => {
  const navigate = useNavigate();

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "text-red-600";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

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
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div
        role="button"
        tabIndex={0}
        onClick={handleNavigate}
        onKeyDown={handleKeyDown}
        className="flex cursor-pointer items-center justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-blue-600">
              {applicant.contactInfo?.name?.charAt(0) ||
                applicant.username?.charAt(0) ||
                "A"}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {applicant.contactInfo?.name ||
                  applicant.username ||
                  "Unknown Applicant"}
              </h3>
              <StatusBadge status={applicant.status} />
              {applicant.priority && (
                <span
                  className={`text-xs font-medium ${getPriorityColor(
                    applicant.priority
                  )}`}
                >
                  {applicant.priority.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4 mt-1">
              <p className="text-sm text-gray-600">{applicant.email}</p>
              {applicant.contactInfo?.phone && (
                <p className="text-sm text-gray-600">
                  {applicant.contactInfo.phone}
                </p>
              )}
              <p className="text-sm text-gray-500">
                ID: {applicant.aiKey || applicant.id || "N/A"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-600">
              Joined: {new Date(applicant.createdAt).toLocaleDateString()}
            </p>
            {applicant.applications && applicant.applications.length > 0 && (
              <p className="text-xs text-gray-500">
                {applicant.applications.length} Application(s)
              </p>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={stopPropagation}>
            Message
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApplicantListItem;
