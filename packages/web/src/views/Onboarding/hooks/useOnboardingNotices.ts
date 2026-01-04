import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { useAuthPrompt } from "@web/views/Onboarding/hooks/useAuthPrompt";
import { useOnboardingOverlay } from "@web/views/Onboarding/hooks/useOnboardingOverlay";
import { useOnboardingProgress } from "@web/views/Onboarding/hooks/useOnboardingProgress";
import { useStoredTasks } from "@web/views/Onboarding/hooks/useStoredTasks";
import type { OnboardingNotice } from "@web/views/Onboarding/types/onboarding-notice.types";

interface UseOnboardingNoticesReturn {
  notices: OnboardingNotice[];
}

export function useOnboardingNotices(): UseOnboardingNoticesReturn {
  const navigate = useNavigate();
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
        header: "Sign in to sync across devices",
        body: "Your tasks are saved locally. Sign in to sync with Google Calendar and access your data from any device.",
        primaryAction: {
          label: "Sign in",
          onClick: () => navigate(ROOT_ROUTES.LOGIN),
        },
        secondaryAction: {
          label: "Later",
          onClick: dismissAuthPrompt,
        },
      },
    ];
  }, [dismissAuthPrompt, navigate, showAuthPrompt]);

  return { notices };
}
