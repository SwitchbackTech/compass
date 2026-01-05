import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import {
  COMPASS_TASKS_SAVED_EVENT_NAME,
  CompassTasksSavedEvent,
  getDateKey,
  loadTasksFromStorage,
} from "@web/common/utils/storage/storage.util";
import {
  ONBOARDING_STEP_CONFIGS,
  type OnboardingStepName,
} from "../constants/onboarding.constants";
import { isStepCompleted } from "../utils/onboarding.storage.util";

interface UseStepDetectionProps {
  currentStep: OnboardingStepName | null;
  onStepComplete: (step: OnboardingStepName) => void;
}

/**
 * Unified hook to detect step completion for all onboarding steps
 * Dynamically sets up detection logic based on step configuration
 */
export function useStepDetection({
  currentStep,
  onStepComplete,
}: UseStepDetectionProps): void {
  const location = useLocation();

  // Refs for tracking state across detection types
  const initialTaskCountRef = useRef<number | null>(null);
  const initialDescriptionsRef = useRef<Map<string, string>>(new Map());
  const initialReminderRef = useRef<string | null>(null);
  const hasCompletedRef = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (currentStep === null) {
      // Reset all refs when no step is active
      hasCompletedRef.current = false;
      initialTaskCountRef.current = null;
      initialDescriptionsRef.current.clear();
      initialReminderRef.current = null;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Find step configuration
    const stepConfig = ONBOARDING_STEP_CONFIGS.find(
      (config) => config.id === currentStep,
    );

    if (!stepConfig) {
      return;
    }

    // Skip detection if step is already completed
    if (isStepCompleted(currentStep)) {
      return;
    }

    if (hasCompletedRef.current) return;

    // Handle different detection types
    switch (stepConfig.detectionType) {
      case "task-count": {
        // Initialize task count when step becomes active
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
            onStepComplete(currentStep);
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
      }

      case "task-description": {
        // Initialize task descriptions when step becomes active
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
            const initialDesc =
              initialDescriptionsRef.current.get(task.id) || "";
            const currentDesc = task.description || "";

            // If description changed from initial state
            if (currentDesc !== initialDesc && currentDesc.trim() !== "") {
              hasCompletedRef.current = true;
              onStepComplete(currentStep);
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
      }

      case "reminder-poll": {
        if (typeof window === "undefined") return;

        // Initialize reminder value when step becomes active
        const initialReminder =
          localStorage.getItem(STORAGE_KEYS.REMINDER) || "";
        initialReminderRef.current = initialReminder;

        // Poll localStorage every 500ms to detect changes
        pollingIntervalRef.current = setInterval(() => {
          if (hasCompletedRef.current) {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            return;
          }

          const currentReminder =
            localStorage.getItem(STORAGE_KEYS.REMINDER) || "";

          // Check if reminder changed from initial state
          if (
            initialReminderRef.current !== null &&
            currentReminder !== initialReminderRef.current &&
            currentReminder.trim() !== ""
          ) {
            hasCompletedRef.current = true;
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            onStepComplete(currentStep);
          }
        }, 500);

        return () => {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        };
      }

      case "route": {
        const routeConfig = stepConfig.detectionConfig as
          | { route: string; routePrefixes?: string[] }
          | undefined;
        if (!routeConfig) return;

        // Normalize route paths for comparison
        const targetRoute =
          routeConfig.route === "/" ? ROOT_ROUTES.ROOT : routeConfig.route;
        const currentPath = location.pathname;
        const matchesPrefix =
          routeConfig.routePrefixes?.some((prefix) =>
            currentPath.startsWith(prefix),
          ) ?? false;

        // Check if we're on the target route
        if (
          !hasCompletedRef.current &&
          (currentPath === targetRoute || matchesPrefix)
        ) {
          hasCompletedRef.current = true;
          onStepComplete(currentStep);
        }
        return;
      }

      default:
        return;
    }
  }, [currentStep, location.pathname, onStepComplete]);

  // Reset refs when step changes
  useEffect(() => {
    return () => {
      hasCompletedRef.current = false;
      initialTaskCountRef.current = null;
      initialDescriptionsRef.current.clear();
      initialReminderRef.current = null;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [currentStep]);
}
