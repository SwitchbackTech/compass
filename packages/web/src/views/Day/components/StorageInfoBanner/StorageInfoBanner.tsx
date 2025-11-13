import { useEffect, useState } from "react";

const STORAGE_DISMISS_KEY = "compass.day.storage-info-dismissed";

export const StorageInfoBanner = () => {
  // Initialize by checking localStorage immediately to avoid flash
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return localStorage.getItem(STORAGE_DISMISS_KEY) === "true";
  });

  useEffect(() => {
    // Double-check on mount in case localStorage changed
    const dismissed = localStorage.getItem(STORAGE_DISMISS_KEY);
    setIsDismissed(dismissed === "true");
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_DISMISS_KEY, "true");
    setIsDismissed(true);
  };

  if (isDismissed) {
    return null;
  }

  return (
    <>
      {/* Spacer to push content down when banner is visible */}
      <div className="h-[93px]" aria-hidden="true" />
      <div className="fixed top-0 right-0 left-0 z-50 border-b border-blue-500/30 bg-blue-600/20 px-4 py-3 text-sm text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <p>
              <strong>Browser Storage:</strong> Your day tasks are saved in your
              browser&apos;s local storage. Clearing your browser data will
              remove all tasks.
            </p>
            <p>
              Think of day tasks as simple ways to stay focused on today, rather
              than tasks you&apos;ll track over long timelines or go back to for
              reference.
            </p>
            <p>
              We&apos;ll store your tasks in our cloud database for protection
              soon, but now is a good time to get familiar with the workflow and
              start taking control of your day.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="mt-1 flex-shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white transition-colors duration-200 hover:bg-blue-700"
            aria-label="Dismiss storage information"
          >
            Got it
          </button>
        </div>
      </div>
    </>
  );
};
