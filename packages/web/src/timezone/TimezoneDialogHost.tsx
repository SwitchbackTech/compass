import { useEffect, useRef } from "react";
import {
  reopenCommandPaletteIfNeeded,
  useSettingsStore,
} from "@web/settings/settings.store";
import { TimezonePickerDialog } from "@web/timezone/TimezonePickerDialog";
import {
  selectTimezoneDialogOpen,
  selectTimezoneDialogPurpose,
  selectTimezoneDialogRestoreFocus,
  timezoneDialogActions,
  useTimezoneDialogStore,
} from "@web/timezone/timezone-dialog.store";

export function TimezoneDialogHost() {
  const isOpen = useTimezoneDialogStore(selectTimezoneDialogOpen);
  const purpose = useTimezoneDialogStore(selectTimezoneDialogPurpose);
  const restoreFocus = useTimezoneDialogStore(selectTimezoneDialogRestoreFocus);
  const skipFocusRestoreRef = useRef(false);

  useEffect(() => {
    if (isOpen) skipFocusRestoreRef.current = false;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    skipFocusRestoreRef.current =
      useSettingsStore.getState().overlayOpenedFromPalette;
    reopenCommandPaletteIfNeeded(timezoneDialogActions.close);
  };

  return (
    <TimezonePickerDialog
      onDismiss={handleDismiss}
      purpose={purpose}
      restoreFocus={restoreFocus}
      skipFocusRestoreRef={skipFocusRestoreRef}
    />
  );
}
