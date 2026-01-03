import React from "react";
import { useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { updateOnboardingProgress } from "@web/views/Onboarding/utils/onboarding.storage.util";

interface AuthPromptProps {
  onDismiss: () => void;
}

export const AuthPrompt: React.FC<AuthPromptProps> = ({ onDismiss }) => {
  const navigate = useNavigate();

  const handleDismiss = () => {
    updateOnboardingProgress({ isAuthDismissed: true });
    onDismiss();
  };

  const handleSignIn = () => {
    navigate(ROOT_ROUTES.LOGIN);
  };

  return (
    <div className="fixed right-6 bottom-6 z-40 max-w-sm">
      <div className="bg-bg-primary border-border-primary rounded-lg border p-4 shadow-lg">
        <div className="mb-3">
          <h3 className="text-text-light mb-1 text-lg font-semibold">
            Sign in to sync across devices
          </h3>
          <p className="text-text-light/80 text-sm">
            Your tasks are saved locally. Sign in to sync with Google Calendar
            and access your data from any device.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSignIn}
            className="bg-accent-primary hover:bg-accent-primary/90 flex-1 rounded px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            Sign in
          </button>
          <button
            onClick={handleDismiss}
            className="border-border-primary bg-bg-secondary text-text-light hover:bg-bg-tertiary rounded border px-4 py-2 text-sm font-medium transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};
