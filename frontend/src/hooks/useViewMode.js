import { useState, useEffect } from "react";

/**
 * Custom hook to manage view mode with localStorage persistence
 * @param {string} storageKey - Unique key for localStorage
 * @param {string[]} availableViews - Array of available view modes
 * @param {string} defaultView - Default view mode if none saved
 * @returns {[string, function]} - [currentView, setView]
 */
export const useViewMode = (
  storageKey,
  availableViews = ["card", "list"],
  defaultView = "card"
) => {
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved && availableViews.includes(saved) ? saved : defaultView;
  });

  // Save to localStorage whenever viewMode changes
  useEffect(() => {
    localStorage.setItem(storageKey, viewMode);
  }, [viewMode, storageKey]);

  const handleViewChange = (newView) => {
    if (availableViews.includes(newView)) {
      setViewMode(newView);
    }
  };

  return [viewMode, handleViewChange];
};

export default useViewMode;

