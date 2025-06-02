// hooks/useFormKeyboardSubmit.ts
import { RefObject, useEffect } from "react";

interface UseFormKeyboardSubmitProps {
  onSubmit: () => void;
  isFormOpen: boolean;
  formRef: RefObject<HTMLFormElement>;
}

export const useFormKeyboardSubmit = ({
  onSubmit,
  isFormOpen,
  formRef,
}: UseFormKeyboardSubmitProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard events when form is open
      if (!isFormOpen || !formRef.current) {
        return;
      }

      // Check if the event target is within our form
      const isWithinForm = formRef.current.contains(e.target as Node);
      if (!isWithinForm) {
        return;
      }

      // Handle META+ENTER or CTRL+ENTER for form submission
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        onSubmit();
        return;
      }

      // Handle regular ENTER for form submission (excluding buttons)
      if (e.key === "Enter" && !e.shiftKey) {
        const target = e.target as HTMLElement;

        // Allow ENTER in textareas (for line breaks)
        if (target.tagName === "TEXTAREA") {
          return;
        }

        // Prevent ENTER on buttons (they should be clicked instead)
        if (target.tagName === "BUTTON") {
          return;
        }

        // For input fields, submit the form
        if (target.tagName === "INPUT") {
          e.preventDefault();
          e.stopPropagation();
          onSubmit();
        }
      }
    };

    // Add event listener to document to catch all keyboard events
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onSubmit, isFormOpen, formRef]);
};
