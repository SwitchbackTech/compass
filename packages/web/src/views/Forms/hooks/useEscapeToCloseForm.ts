import { useState } from "react";
import {
  isContextMenuOpen,
  isFloatingLayerOpen,
} from "@web/common/utils/form/form.util";
import { selectGridDraft, useDraftStore } from "@web/events/stores/draft.store";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";
import { shouldConfirmDiscardUnsavedChanges } from "@web/views/Forms/hooks/shouldConfirmDiscardUnsavedChanges";

/**
 * Escape closes the event-details form. Dirty edits of a persisted event
 * confirm first; create drafts and unchanged edits discard immediately.
 * Nested floating layers (menus, dialogs) win Escape via isFloatingLayerOpen.
 */
export const useEscapeToCloseForm = (onClose: () => void) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useAppShortcut(
    "Escape",
    (keyboardEvent) => {
      if (isContextMenuOpen()) return;
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

  return {
    isConfirmOpen,
    onCancelConfirm: () => setIsConfirmOpen(false),
    onDiscardConfirm: () => {
      setIsConfirmOpen(false);
      onClose();
    },
  };
};
