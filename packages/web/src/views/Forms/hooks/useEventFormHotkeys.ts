import { useCallback, useEffect, RefObject } from "react";
import { Key } from "ts-key-enum";

interface HotkeysOptions<TEvent> {
  event: TEvent;
  onSubmit: () => void;
  onDuplicate?: (event: TEvent) => void;
  onConvert?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  isDraft?: boolean;
}

export function useEventFormHotkeys<TEvent>(
  formRef: RefObject<HTMLFormElement>,
  opts: HotkeysOptions<TEvent>
) {
  const { event, onSubmit, onDuplicate, onConvert, onDelete, onClose, isDraft } = opts;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!(e.target instanceof HTMLElement)) return;

      const isTextInput = ["INPUT", "TEXTAREA"].includes(e.target.tagName);
      if (isTextInput && !(e.metaKey || e.ctrlKey)) return;

      switch (true) {
        case (e.metaKey || e.ctrlKey) && e.key === "Enter":
          e.preventDefault();
          formRef.current?.requestSubmit?.();
          break;
        case (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d":
          e.preventDefault();
          onDuplicate?.(event);
          break;
        case (e.metaKey || e.ctrlKey) && e.shiftKey && e.key === ",":
          e.preventDefault();
          !isDraft && onConvert?.();
          break;
        case e.key === "Delete":
          if (isDraft) {
            onClose?.();
          } else if (window.confirm(`Delete ${event.title || "this event"}?`)) {
            onDelete?.();
          }
          break;
        case e.key === "Backspace":
          e.stopPropagation();
          break;
      }
    },
    [event, isDraft, onDuplicate, onConvert, onDelete, onClose, formRef, onSubmit]
  );

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    form.addEventListener("keydown", handleKeyDown as EventListener, true);
    return () => {
      form.removeEventListener("keydown", handleKeyDown as EventListener, true);
    };
  }, [handleKeyDown, formRef]);
}
