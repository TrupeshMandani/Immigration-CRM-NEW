import { useState, useEffect } from "react";

const ViewToggle = ({
  currentView,
  onViewChange,
  views = ["card", "list"],
  className = "",
  storageKey = "viewMode", // Allow custom storage key for different pages
}) => {
  const [activeView, setActiveView] = useState(() => {
    // Try to get from localStorage first, then currentView, then default to "card"
    const saved = localStorage.getItem(storageKey);
    return saved && views.includes(saved) ? saved : currentView || "card";
  });

  // Save to localStorage whenever activeView changes
  useEffect(() => {
    localStorage.setItem(storageKey, activeView);
  }, [activeView, storageKey]);

  const handleViewChange = (view) => {
    setActiveView(view);
    onViewChange(view);
  };

  const getViewIcon = (view) => {
    switch (view) {
      case "card":
        return (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
        );
      case "list":
        return (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 10h16M4 14h16M4 18h16"
            />
          </svg>
        );
      case "table":
        return (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M3 14h18m-9-4v8m-7 0V4a1 1 0 011-1h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`flex items-center space-x-1 bg-gray-100 rounded-lg p-1 ${className}`}
    >
      {views.map((view) => (
        <button
          key={view}
          onClick={() => handleViewChange(view)}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeView === view
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
          title={`Switch to ${view} view`}
        >
          {getViewIcon(view)}
          <span className="capitalize">{view}</span>
        </button>
      ))}
    </div>
  );
};

export default ViewToggle;
