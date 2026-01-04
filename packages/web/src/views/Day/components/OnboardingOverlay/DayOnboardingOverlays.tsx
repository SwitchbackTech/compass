import { memo } from "react";
import { AuthPrompt } from "@web/views/Day/components/AuthPrompt/AuthPrompt";
import { useOnboardingOverlays } from "@web/views/Day/hooks/onboarding/useOnboardingOverlays";
import { useTasks } from "@web/views/Day/hooks/tasks/useTasks";

export const DayOnboardingOverlays = memo(() => {
  const { tasks } = useTasks();
  const { showAuthPrompt, dismissAuthPrompt } = useOnboardingOverlays({
    tasks,
  });

  if (!showAuthPrompt) {
    return null;
  }

  return <AuthPrompt onDismiss={dismissAuthPrompt} />;
});

DayOnboardingOverlays.displayName = "DayOnboardingOverlays";
