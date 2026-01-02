import React from "react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";

interface OnboardingOverlayProps {
  onDismiss: () => void;
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  onDismiss,
}) => {
  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_OVERLAY_SEEN, "true");
    onDismiss();
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 transform">
      <div className="bg-bg-primary border-border-primary mx-4 max-w-md rounded-lg border p-4 shadow-lg">
        // TODO turn this into its own componenet for onboardin
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-text-light mb-2 text-lg font-semibold">
              Welcome to Compass
            </h3>
            <p className="text-text-light/80 text-sm">
              Type{" "}
              <kbd className="bg-bg-secondary text-text-light border-border-primary rounded border px-1.5 py-0.5 font-mono text-xs">
                c
              </kbd>{" "}
              to create a task
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-text-light/60 hover:text-text-light flex-shrink-0 transition-colors"
            aria-label="Dismiss"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
