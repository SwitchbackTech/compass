import { useEffect, useRef } from "react";
import {
  COMPASS_TASKS_SAVED_EVENT_NAME,
  CompassTasksSavedEvent,
  getDateKey,
  loadTasksFromStorage,
} from "@web/common/utils/storage/storage.util";
import { isStepCompleted } from "../utils/onboardingStorage.util";

interface UseStep1DetectionProps {
  currentStep: number | null;
  onStepComplete: () => void;
}

/**
 * Hook to detect step 1 completion: creating a task with 'c'
 * Monitors task count changes in localStorage
 * Skips detection if step is already completed
 */
export function useStep1Detection({
  currentStep,
  onStepComplete,
}: UseStep1DetectionProps): void {
  const initialTaskCountRef = useRef<number | null>(null);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (currentStep !== 1) {
      // Reset when not on step 1
      hasCompletedRef.current = false;
      initialTaskCountRef.current = null;
      return;
    }

    // Skip detection if step is already completed
    if (isStepCompleted(1)) {
      return;
    }

    if (hasCompletedRef.current) return;

    // Initialize task count when step 1 becomes active
    const dateKey = getDateKey();
    const initialTasks = loadTasksFromStorage(dateKey);
    initialTaskCountRef.current = initialTasks.length;

    if (typeof window === "undefined") return;

    const handleTasksSaved = (event: CompassTasksSavedEvent) => {
      if (hasCompletedRef.current) return;

      const dateKey = getDateKey();
      if (event.detail.dateKey !== dateKey) return;

      const currentTasks = loadTasksFromStorage(dateKey);
      const currentCount = currentTasks.length;

      // Check if a new task was added
      if (
        initialTaskCountRef.current !== null &&
        currentCount > initialTaskCountRef.current
      ) {
        hasCompletedRef.current = true;
        onStepComplete();
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
