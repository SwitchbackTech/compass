import { TimezonePickerDialog } from "@web/timezone/TimezonePickerDialog";
import {
  selectTimezoneDialogOpen,
  selectTimezoneDialogRestoreFocus,
  timezoneDialogActions,
  useTimezoneDialogStore,
} from "@web/timezone/timezone-dialog.store";

export function TimezoneDialogHost() {
  const isOpen = useTimezoneDialogStore(selectTimezoneDialogOpen);
  const restoreFocus = useTimezoneDialogStore(selectTimezoneDialogRestoreFocus);
  if (!isOpen) return null;

  return (
    <TimezonePickerDialog
      onDismiss={timezoneDialogActions.close}
      restoreFocus={restoreFocus}
    />
  );
}
