import { isContextMenuOpen } from "@web/common/utils/form/form.util";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

// A nested floating layer (actions menu, time picker, recurrence selects,
// confirmation dialogs) handles its own Escape; closing the form at the same
// time would tear down both. Two carve-outs for layers that are always
// present rather than transiently floating: overlays that stay mounted while
// hidden (the keyboard-shortcuts dialog — display:none in Day's tree,
// aria-hidden in Week's), and the sidebar's inline month picker, whose
// react-datepicker month grid is a permanently-visible role="listbox".
const isFloatingLayerOpen = () =>
  Array.from(
    document.querySelectorAll(
      '[role="menu"], [role="listbox"], [role="dialog"]',
    ),
  ).some(
    (element) =>
      element.getAttribute("aria-hidden") !== "true" &&
      element.getClientRects().length > 0 &&
      !element.closest('[data-testid="Planner month picker"]'),
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
      if (isContextMenuOpen()) return;
      if (isFloatingLayerOpen()) return;

      keyboardEvent.preventDefault();
      onClose();
    },
    { ignoreInputs: false },
  );
};
