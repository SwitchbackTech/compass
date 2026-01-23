import { useMemo } from "react";
import { useGoogleAuth } from "@web/common/hooks/useGoogleAuth";
import { useAuthPrompt } from "@web/views/Onboarding/hooks/useAuthPrompt";
import { useOnboardingOverlay } from "@web/views/Onboarding/hooks/useOnboardingOverlay";
import { useOnboardingProgress } from "@web/views/Onboarding/hooks/useOnboardingProgress";
import { useStoredTasks } from "@web/views/Onboarding/hooks/useStoredTasks";
import type { OnboardingNotice } from "@web/views/Onboarding/types/onboarding-notice.types";

export function useOnboardingNotices(): { notices: OnboardingNotice[] } {
  const googleAuth = useGoogleAuth();
  const tasks = useStoredTasks();
  const { hasNavigatedDates } = useOnboardingProgress();
  const { showOnboardingOverlay } = useOnboardingOverlay();
  const { showAuthPrompt, dismissAuthPrompt } = useAuthPrompt({
    tasks,
    hasNavigatedDates,
    showOnboardingOverlay,
  });

  const notices = useMemo<OnboardingNotice[]>(() => {
    if (!showAuthPrompt) {
      return [];
    }

    return [
      {
        id: "auth-prompt",
        header: "Connect your Google Calendar",
        body: "Your data is currently saved locally. Sign in to sync with Google Calendar",
        primaryAction: {
          label: "Sign in",
          onClick: () => {
            void googleAuth?.login?.();
          },
        },
        secondaryAction: {
          label: "Later",
          onClick: dismissAuthPrompt,
        },
      },
    ];
  }, [dismissAuthPrompt, googleAuth, showAuthPrompt]);

  return { notices };
}
