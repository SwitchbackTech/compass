import { useEffect, useRef } from "react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { isStepCompleted } from "../utils/onboardingStorage.util";

interface UseStep4DetectionProps {
  currentStep: number | null;
  onStepComplete: () => void;
}

/**
 * Hook to detect step 4 completion: editing reminder with 'r' key
 * Monitors reminder changes in localStorage using polling mechanism
 * Skips detection if step is already completed
 */
export function useStep4Detection({
  currentStep,
  onStepComplete,
}: UseStep4DetectionProps): void {
  const initialReminderRef = useRef<string | null>(null);
  const hasCompletedRef = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (currentStep !== 4) {
      // Reset when not on step 4
      hasCompletedRef.current = false;
      initialReminderRef.current = null;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Skip detection if step is already completed
    if (isStepCompleted(4)) {
      return;
    }

    if (hasCompletedRef.current) return;

    if (typeof window === "undefined") return;

    // Initialize reminder value when step 4 becomes active
    const initialReminder = localStorage.getItem(STORAGE_KEYS.REMINDER) || "";
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

      const currentReminder = localStorage.getItem(STORAGE_KEYS.REMINDER) || "";

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
        onStepComplete();
      }
    }, 500);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [currentStep, onStepComplete]);
}
