import { isSomedayEventActionMenuOpen } from "@web/common/utils/event/someday.event.util";
import { isContextMenuOpen } from "@web/common/utils/form/form.util";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

// A nested floating layer (actions menu, time picker, recurrence selects,
// confirmation dialogs) mounts these roles only while open and handles its
// own Escape; closing the form at the same time would tear down both.
const isFloatingLayerOpen = () =>
  Boolean(
    document.querySelector('[role="menu"], [role="listbox"], [role="dialog"]'),
  );

/**
 * Escape closes the event-details form. The floating forms used to get this
 * from floating-ui's `useDismiss`; the docked sidebar panel binds it
 * explicitly.
 */
export const useEscapeToCloseForm = (onClose: () => void) => {
  useAppShortcut(
    "Escape",
    (keyboardEvent) => {
      if (isContextMenuOpen() || isSomedayEventActionMenuOpen()) return;
      if (isFloatingLayerOpen()) return;

      keyboardEvent.preventDefault();
      onClose();
    },
    { ignoreInputs: false },
  );
};
