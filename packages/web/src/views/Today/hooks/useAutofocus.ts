import { RefObject, useEffect } from "react";

interface UseAutofocusOptions {
  shouldFocus: boolean;
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement>;
  selectText?: boolean;
  delay?: number;
  preventScroll?: boolean;
  dependencies?: unknown[];
}

/**
 * Hook to automatically focus an input element when conditions are met
 */
export function useAutofocus({
  shouldFocus,
  inputRef,
  selectText = false,
  delay = 0,
  preventScroll = false,
  dependencies = [],
}: UseAutofocusOptions) {
  useEffect(() => {
    if (!shouldFocus || !inputRef.current) return;

    const focusInput = () => {
      const input = inputRef.current;
      if (!input) return;

      try {
        if (preventScroll) {
          input.focus({ preventScroll: true });
        } else {
          input.focus();
        }

        if (selectText && input.value) {
          input.select();
        }
      } catch (error) {
        // Fallback if focus options not supported
        try {
          input.focus();
          if (selectText && input.value) {
            input.select();
          }
        } catch {
          // Ignore if focus fails
        }
      }
    };

    if (delay > 0) {
      const timeoutId = setTimeout(focusInput, delay);
      return () => clearTimeout(timeoutId);
    } else {
      focusInput();
    }
  }, [shouldFocus, selectText, delay, preventScroll, ...dependencies]);
}
