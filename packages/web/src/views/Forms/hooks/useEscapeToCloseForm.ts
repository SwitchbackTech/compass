import { useState } from "react";
import { selectGridDraft, useDraftStore } from "@web/events/stores/draft.store";
import { isFloatingLayerOpen } from "@web/shortcuts/floating-layer";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";
import { shouldConfirmDiscardUnsavedChanges } from "@web/views/Forms/hooks/shouldConfirmDiscardUnsavedChanges";

/**
 * Escape closes the event-details form. Dirty edits of a persisted event
 * confirm first; create drafts and unchanged edits discard immediately.
 * Shift+Escape always discards without prompting.
 * Nested floating layers (menus, listboxes, date pickers) register via
 * `useFloatingLayer` so Escape closes them first.
 */
export const useEscapeToCloseForm = (onClose: () => void) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useAppShortcut(
    "Escape",
    (keyboardEvent) => {
      if (isFloatingLayerOpen()) return;

      keyboardEvent.preventDefault();

      const draft = selectGridDraft(useDraftStore.getState());
      if (shouldConfirmDiscardUnsavedChanges(draft)) {
        setIsConfirmOpen(true);
        return;
      }

      onClose();
    },
    { ignoreInputs: false },
  );

  useAppShortcut(
    "Shift+Escape",
    (keyboardEvent) => {
      if (isFloatingLayerOpen()) return;

      keyboardEvent.preventDefault();
      setIsConfirmOpen(false);
      onClose();
    },
    { ignoreInputs: false },
  );

  return {
    isConfirmOpen,
    onCancelConfirm: () => setIsConfirmOpen(false),
    onDiscardConfirm: () => {
      setIsConfirmOpen(false);
      onClose();
    },
  };
};
