import { useEffect, useRef } from "react";

interface UseOnboardingShortcutsProps {
  onNext: () => void;
  onPrevious: () => void;
  canNavigateNext: boolean;
  shouldPreventNavigation?: boolean;
  handlesKeyboardEvents?: boolean;
  disableLeftArrow?: boolean;
}

export const useOnboardingShortcuts = ({
  onNext,
  onPrevious,
  canNavigateNext,
  shouldPreventNavigation = false,
  handlesKeyboardEvents = false,
  disableLeftArrow = false,
}: UseOnboardingShortcutsProps) => {
  const shouldPreventNavigationRef = useRef(shouldPreventNavigation);

  // Update the ref when the prop changes
  useEffect(() => {
    shouldPreventNavigationRef.current = shouldPreventNavigation;
  }, [shouldPreventNavigation]);

  useEffect(() => {
    // If the step handles its own keyboard events, don't add our listeners
    if (handlesKeyboardEvents) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const isRightArrow = event.key === "ArrowRight";
      const isEnter = event.key === "Enter";
      const isLeftArrow = event.key === "ArrowLeft";

      // Check if we should prevent navigation
      const shouldPrevent = shouldPreventNavigationRef.current;

      // For right arrow navigation
      if (isRightArrow) {
        if (shouldPrevent || !canNavigateNext) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onNext();
      }

      // For left arrow navigation
      if (isLeftArrow) {
        if (disableLeftArrow) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
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
        if (shouldPrevent || !canNavigateNext) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        // If all conditions are met, navigate to next step
        onNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown, false);
    return () => document.removeEventListener("keydown", handleKeyDown, false);
  }, [
    onNext,
    onPrevious,
    canNavigateNext,
    shouldPreventNavigation,
    handlesKeyboardEvents,
    disableLeftArrow,
  ]);

  return {
    shouldPreventNavigation: shouldPreventNavigationRef.current,
  };
};
