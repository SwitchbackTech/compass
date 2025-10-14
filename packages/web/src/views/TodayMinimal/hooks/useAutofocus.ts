import { useCallback, useEffect, useRef } from "react";

export interface AutofocusConfig {
  // Focus triggers
  shouldFocus?: boolean;
  focusOnMount?: boolean;
  focusOnCondition?: boolean;

  // Focus targets
  inputRef?: React.RefObject<HTMLInputElement>;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  elementRef?: React.RefObject<HTMLElement>;
  selector?: string;

  // Focus behavior
  selectText?: boolean;
  preventScroll?: boolean;
  scrollIntoView?: boolean;
  scrollBehavior?: ScrollBehavior;
  scrollBlock?: ScrollLogicalPosition;
  scrollInline?: ScrollLogicalPosition;

  // Timing
  delay?: number;

  // Dependencies that should trigger refocus
  dependencies?: React.DependencyList;
}

export function useAutofocus(config: AutofocusConfig) {
  const {
    shouldFocus = false,
    focusOnMount = false,
    focusOnCondition = false,
    inputRef,
    textareaRef,
    elementRef,
    selector,
    selectText = false,
    preventScroll = false,
    scrollIntoView = false,
    scrollBehavior = "smooth",
    scrollBlock = "center",
    scrollInline = "nearest",
    delay = 0,
    dependencies = [],
  } = config;

  const focusElement = useCallback(() => {
    const targetElement =
      inputRef?.current ||
      textareaRef?.current ||
      elementRef?.current ||
      (selector ? (document.querySelector(selector) as HTMLElement) : null);

    if (!targetElement) return;

    const focusOptions = preventScroll ? { preventScroll } : undefined;

    try {
      targetElement.focus(focusOptions as any);

      if (
        selectText &&
        (targetElement instanceof HTMLInputElement ||
          targetElement instanceof HTMLTextAreaElement)
      ) {
        targetElement.select();
      }

      if (scrollIntoView) {
        targetElement.scrollIntoView({
          behavior: scrollBehavior,
          block: scrollBlock,
          inline: scrollInline,
        });
      }
    } catch (error) {
      // Fallback for older browsers
      try {
        targetElement.focus();
        if (
          selectText &&
          (targetElement instanceof HTMLInputElement ||
            targetElement instanceof HTMLTextAreaElement)
        ) {
          targetElement.select();
        }
      } catch (fallbackError) {
        console.warn("Failed to focus element:", fallbackError);
      }
    }
  }, [
    inputRef,
    textareaRef,
    elementRef,
    selector,
    selectText,
    preventScroll,
    scrollIntoView,
    scrollBehavior,
    scrollBlock,
    scrollInline,
  ]);

  const scheduleFocus = useCallback(() => {
    if (delay && delay > 0) {
      const timer = setTimeout(focusElement, delay);
      return () => clearTimeout(timer);
    }
    focusElement();
    return undefined;
  }, [focusElement, delay]);

  // Focus on mount
  useEffect(() => {
    if (focusOnMount) {
      return scheduleFocus();
    }
  }, [focusOnMount, scheduleFocus]);

  // Focus when condition changes
  useEffect(() => {
    if (focusOnCondition) {
      return scheduleFocus();
    }
  }, [focusOnCondition, scheduleFocus, ...dependencies]);

  // Focus when shouldFocus changes
  useEffect(() => {
    if (shouldFocus) {
      return scheduleFocus();
    }
  }, [shouldFocus, scheduleFocus]);

  return {
    focusElement,
  };
}
