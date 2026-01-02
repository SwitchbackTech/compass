import { useEffect, useRef } from "react";
import {
  COMPASS_TASKS_SAVED_EVENT_NAME,
  CompassTasksSavedEvent,
  getDateKey,
  loadTasksFromStorage,
} from "@web/common/utils/storage/storage.util";
import { ONBOARDING_STEPS } from "../constants/onboarding.constants";
import type { OnboardingStepName } from "../constants/onboarding.constants";
import { isStepCompleted } from "../utils/onboardingStorage.util";

interface UseStep3DetectionProps {
  currentStep: OnboardingStepName | null;
  onStepComplete: () => void;
}

/**
 * Hook to detect step 3 completion: customizing note-to-self (task description)
 * Monitors task description changes in localStorage
 * Skips detection if step is already completed
 */
export function useStep3Detection({
  currentStep,
  onStepComplete,
}: UseStep3DetectionProps): void {
  const initialDescriptionsRef = useRef<Map<string, string>>(new Map());
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (currentStep !== ONBOARDING_STEPS.EDIT_DESCRIPTION) {
      // Reset when not on step 3
      hasCompletedRef.current = false;
      initialDescriptionsRef.current.clear();
      return;
    }

    // Skip detection if step is already completed
    if (isStepCompleted(ONBOARDING_STEPS.EDIT_DESCRIPTION)) {
      return;
    }

    if (hasCompletedRef.current) return;

    // Initialize task descriptions when step 3 becomes active
    const dateKey = getDateKey();
    const initialTasks = loadTasksFromStorage(dateKey);
    initialDescriptionsRef.current = new Map(
      initialTasks.map((task) => [task.id, task.description || ""]),
    );

    if (typeof window === "undefined") return;

    const handleTasksSaved = (event: CompassTasksSavedEvent) => {
      if (hasCompletedRef.current) return;

      const dateKey = getDateKey();
      if (event.detail.dateKey !== dateKey) return;

      const currentTasks = loadTasksFromStorage(dateKey);

      // Check if any task description was modified
      for (const task of currentTasks) {
        const initialDesc = initialDescriptionsRef.current.get(task.id) || "";
        const currentDesc = task.description || "";

        // If description changed from initial state
        if (currentDesc !== initialDesc && currentDesc.trim() !== "") {
          hasCompletedRef.current = true;
          onStepComplete();
          return;
        }
      }
    };

    window.addEventListener(
      COMPASS_TASKS_SAVED_EVENT_NAME,
      handleTasksSaved as EventListener,
    );

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          COMPASS_TASKS_SAVED_EVENT_NAME,
          handleTasksSaved as EventListener,
        );
      }
    };
  }, [currentStep, onStepComplete]);
}
