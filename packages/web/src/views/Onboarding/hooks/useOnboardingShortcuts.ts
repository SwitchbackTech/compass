import { useEffect, useRef } from "react";

interface UseOnboardingShortcutsProps {
  onNext: () => void;
  onPrevious: () => void;
  canNavigateNext: boolean;
  nextButtonDisabled: boolean;
  shouldPreventNavigation?: boolean;
}

export const useOnboardingShortcuts = ({
  onNext,
  onPrevious,
  canNavigateNext,
  nextButtonDisabled,
  shouldPreventNavigation = false,
}: UseOnboardingShortcutsProps) => {
  const shouldPreventNavigationRef = useRef(shouldPreventNavigation);

  // Update the ref when the prop changes
  useEffect(() => {
    shouldPreventNavigationRef.current = shouldPreventNavigation;
  }, [shouldPreventNavigation]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isRightArrow = event.key === "ArrowRight";
      const isEnter = event.key === "Enter";
      const isLeftArrow = event.key === "ArrowLeft";

      // Check if we should prevent navigation
      const shouldPrevent = shouldPreventNavigationRef.current;

      // For right arrow navigation
      if (isRightArrow) {
        if (shouldPrevent || nextButtonDisabled || !canNavigateNext) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onNext();
      }

      // For left arrow navigation
      if (isLeftArrow) {
        onPrevious();
      }

      // For Enter key navigation
      if (isEnter) {
        const activeElement = document.activeElement as HTMLElement;
        const isInputFocused =
          activeElement &&
          (activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA");

        // If focused on an input, let the input handle it
        if (isInputFocused) {
          return;
        }

        // If not focused on input, check navigation rules
        if (shouldPrevent || nextButtonDisabled || !canNavigateNext) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, false);
    return () => document.removeEventListener("keydown", handleKeyDown, false);
  }, [
    onNext,
    onPrevious,
    canNavigateNext,
    nextButtonDisabled,
    shouldPreventNavigation,
  ]);

  return {
    shouldPreventNavigation: shouldPreventNavigationRef.current,
  };
};
