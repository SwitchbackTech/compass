import { useEffect } from "react";

export const useSomedaySandboxKeyboard = ({
  isWeekTaskReady,
  isMonthTaskReady,
  isSubmitting,
  handleNext,
}: {
  isWeekTaskReady: boolean;
  isMonthTaskReady: boolean;
  isSubmitting: boolean;
  handleNext: () => Promise<void>;
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isRightArrow = event.key === "ArrowRight";
      const isEnter = event.key === "Enter";

      // Only handle these keys if we're ready to navigate
      if (
        (isRightArrow || isEnter) &&
        isWeekTaskReady &&
        isMonthTaskReady &&
        !isSubmitting
      ) {
        const activeElement = document.activeElement as HTMLElement;
        const isInputFocused =
          activeElement &&
          (activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA");

        // If focused on an input, let the input handle it
        if (isInputFocused) {
          return;
        }

        // Prevent default behavior and call our handleNext function
        event.preventDefault();
        event.stopPropagation();
        handleNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown, false);
    return () => document.removeEventListener("keydown", handleKeyDown, false);
  }, [isWeekTaskReady, isMonthTaskReady, isSubmitting, handleNext]);
};
