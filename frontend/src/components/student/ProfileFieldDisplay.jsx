const ProfileFieldDisplay = ({ label, value }) => {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;

  const formatValue = (val) => {
    if (val === null || val === undefined) return "N/A";

    // Handle objects by displaying key-value pairs in a readable format
    if (typeof val === "object" && !Array.isArray(val)) {
      return Object.entries(val).map(([key, value]) => (
        <div key={key} className="mb-2">
          <span className="font-medium text-gray-600">{formatLabel(key)}:</span>
          <span className="ml-2 text-gray-800">
            {typeof value === "object" ? formatValue(value) : value}
          </span>
        </div>
      ));
    }

    // Handle arrays by displaying as a clean list
    if (Array.isArray(val)) {
      return (
        <div className="space-y-1">
          {val.map((item, index) => (
            <div key={index} className="flex items-start">
              <span className="text-gray-500 mr-2">•</span>
              <span className="text-gray-800">
                {typeof item === "object" ? formatValue(item) : item}
              </span>
            </div>
          ))}
        </div>
      );
    }

    if (typeof val === "boolean") return val ? "Yes" : "No";
    return val.toString();
  };

  const formatLabel = (fieldName) => {
    // Convert camelCase/snake_case to readable format
    return fieldName
      .replace(/([A-Z])/g, " $1") // Add space before capitals
      .replace(/_/g, " ") // Replace underscores with spaces
      .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
      .trim();
  };

  return (
    <div className="py-4 border-b border-gray-200 last:border-0">
      <dt className="text-sm font-bold text-gray-900 mb-2">
        {formatLabel(label)}
      </dt>
      <dd className="text-sm text-gray-700">{formatValue(value)}</dd>
    </div>
  );
};

export default ProfileFieldDisplay;
