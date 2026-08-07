import {
  isContextMenuOpen,
  isFloatingLayerOpen,
} from "@web/common/utils/form/form.util";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

/**
 * Escape closes the event-details form. The floating forms used to get this
 * from floating-ui's `useDismiss`; the docked sidebar panel binds it
 * explicitly.
 */
export const useEscapeToCloseForm = (onClose: () => void) => {
  useAppShortcut(
    "Escape",
    (keyboardEvent) => {
      if (isContextMenuOpen()) return;
      if (isFloatingLayerOpen()) return;

      keyboardEvent.preventDefault();
      onClose();
    },
    { ignoreInputs: false },
  );
};
