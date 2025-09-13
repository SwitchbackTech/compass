import { useEffect, useRef } from "react";

interface UseOnboardingShortcutsProps {
  onNext: () => void;
  onPrevious: () => void;
  canNavigateNext: boolean;
  shouldPreventNavigation?: boolean;
  handlesKeyboardEvents?: boolean;
  disablePrevious?: boolean;
}

// Helper function to check if an input field is currently focused
const isInputFieldFocused = (): boolean => {
  const activeElement = document.activeElement as HTMLElement;
  return (
    activeElement &&
    (activeElement.tagName === "INPUT" ||
      activeElement.tagName === "TEXTAREA" ||
      activeElement.contentEditable === "true")
  );
};

export const useOnboardingShortcuts = ({
  onNext,
  onPrevious,
  canNavigateNext,
  shouldPreventNavigation = false,
  handlesKeyboardEvents = false,
  disablePrevious = false,
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
      const isNextKey = event.key === "k" || event.key === "K";
      const isEnter = event.key === "Enter";
      const isPreviousKey = event.key === "j" || event.key === "J";

      // Check if we should prevent navigation
      const shouldPrevent = shouldPreventNavigationRef.current;

      // For 'k' key navigation (next)
      if (isNextKey) {
        // Allow typing in input fields
        if (isInputFieldFocused()) {
          return;
        }

        if (shouldPrevent || !canNavigateNext) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        onNext();
      }

      // For 'j' key navigation (previous)
      if (isPreviousKey) {
        // Allow typing in input fields
        if (isInputFieldFocused()) {
          return;
        }

        if (disablePrevious) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        onPrevious();
      }

      // For Enter key navigation
      if (isEnter) {
        // If focused on an input, let the input handle it
        if (isInputFieldFocused()) {
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
    disablePrevious,
  ]);

  return {
    shouldPreventNavigation: shouldPreventNavigationRef.current,
  };
};
