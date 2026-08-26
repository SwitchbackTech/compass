import { useEffect } from "react";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";
import { timezoneDialogActions } from "@web/timezone/timezone-dialog.store";
import {
  availabilityActions,
  useAvailabilityStore,
} from "./availability.store";
import { COPY_AVAILABILITY_LABEL } from "./availability-slot.focus";

/**
 * Only the keys that must work wherever focus sits - including after the last
 * pick is accepted and focus has moved to the Copy button. Repositioning,
 * accepting, Tab and add/remove are handled on the grid overlay itself, where
 * DOM focus is: registering them globally as well would fire them twice and
 * fight the focused button's native Enter/Space activation.
 */
export function useAvailabilityShortcuts() {
  const enabled = useAvailabilityStore((state) => state.isOpen);

  useAppShortcut(
    "Z",
    () =>
      timezoneDialogActions.open(
        undefined,
        "availability-recipient",
        availabilityActions.setRecipientZone,
      ),
    { enabled },
  );
  useAppShortcut("Shift+Z", () => availabilityActions.setRecipientZone(null), {
    enabled,
  });
  useAppShortcut("Escape", availabilityActions.close, { enabled });
  useAppShortcut(
    "Mod+C",
    () =>
      document
        .querySelector<HTMLButtonElement>(
          `[aria-label='${COPY_AVAILABILITY_LABEL}']`,
        )
        ?.click(),
    { enabled },
  );

  useEffect(() => () => availabilityActions.close(), []);
}
