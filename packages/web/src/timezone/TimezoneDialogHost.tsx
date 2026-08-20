import { restoreCommandPaletteFocus } from "@web/components/Feedback/FeedbackDialogHost";
import { TimezonePickerDialog } from "@web/timezone/TimezonePickerDialog";
import {
  selectTimezoneDialogOpen,
  timezoneDialogActions,
  useTimezoneDialogStore,
} from "@web/timezone/timezone-dialog.store";

export function TimezoneDialogHost() {
  const isOpen = useTimezoneDialogStore(selectTimezoneDialogOpen);
  if (!isOpen) return null;

  return (
    <TimezonePickerDialog
      onDismiss={timezoneDialogActions.close}
      restoreFocus={restoreCommandPaletteFocus}
    />
  );
}
