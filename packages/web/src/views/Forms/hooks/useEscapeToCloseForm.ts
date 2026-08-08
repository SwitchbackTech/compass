import { useCallback, useState } from "react";
import {
  isContextMenuOpen,
  isFloatingLayerOpen,
} from "@web/common/utils/form/form.util";
import { selectGridDraft, useDraftStore } from "@web/events/stores/draft.store";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";
import { shouldConfirmDiscardUnsavedChanges } from "@web/views/Forms/hooks/shouldConfirmDiscardUnsavedChanges";

export type EscapeToCloseFormConfirm = {
  isConfirmOpen: boolean;
  onCancelConfirm: () => void;
  onDiscardConfirm: () => void;
};

/**
 * Escape closes the event-details form. Dirty edits of a persisted event
 * confirm first; create drafts and unchanged edits discard immediately.
 * Nested floating layers (menus, dialogs) win Escape via isFloatingLayerOpen.
 */
export const useEscapeToCloseForm = (
  onClose: () => void,
): EscapeToCloseFormConfirm => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const onCancelConfirm = useCallback(() => {
    setIsConfirmOpen(false);
  }, []);

  const onDiscardConfirm = useCallback(() => {
    setIsConfirmOpen(false);
    onClose();
  }, [onClose]);

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

  return { isConfirmOpen, onCancelConfirm, onDiscardConfirm };
};
