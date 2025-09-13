import { useEffect } from "react";

export const useSomedaySandboxKeyboard = ({
  isWeekTaskReady,
  isMonthTaskReady,
  isSubmitting,
  handleNext,
  onPrevious,
}: {
  isWeekTaskReady: boolean;
  isMonthTaskReady: boolean;
  isSubmitting: boolean;
  handleNext: () => Promise<void>;
  onPrevious: () => void;
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isRightArrow = event.key === "ArrowRight";
      const isEnter = event.key === "Enter";
      const isNextKey = event.key === "k" || event.key === "K";
      const isPreviousKey = event.key === "j" || event.key === "J";

      // Check if input is focused to avoid interfering with typing
      const activeElement = document.activeElement as HTMLElement;
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.contentEditable === "true");

      // Handle 'j' key for previous navigation - always allowed
      if (isPreviousKey) {
        // Allow typing in input fields
        if (isInputFocused) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        onPrevious();
        return;
      }

      // Handle next navigation (enter, or 'k' key)
      const isNextAction = isEnter || isNextKey;
      const canNavigateNext =
        isWeekTaskReady && isMonthTaskReady && !isSubmitting;

      if (isNextAction) {
        // If focused on an input, let the input handle it
        if (isInputFocused) {
          return;
        }

        // Only proceed if all conditions are met
        if (canNavigateNext) {
          event.preventDefault();
          event.stopPropagation();
          handleNext();
        } else {
          // Prevent default behavior even if we can't navigate
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, false);
    return () => document.removeEventListener("keydown", handleKeyDown, false);
  }, [isWeekTaskReady, isMonthTaskReady, isSubmitting, handleNext, onPrevious]);
};
