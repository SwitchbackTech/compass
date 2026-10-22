import { APP_SHORTCUT_BINDINGS } from "@core/shortcuts/app-shortcut-bindings";

/** One keyboard-discoverable action while the event form is open. */
export type EventFormActionEntry = {
  id: string;
  label: string;
  keys: readonly string[];
};

export type EventFormActionListOptions = {
  hasMeetingLink: boolean;
  isExistingEvent: boolean;
  isReadOnly: boolean;
  showBookingFormActions: boolean;
};

/**
 * Command palette rows while the event form is open. Conditional entries are
 * omitted when they cannot fire, so palette labels never advertise dead keys.
 */
export function listEventFormActions(
  options: EventFormActionListOptions,
): EventFormActionEntry[] {
  const rows: EventFormActionEntry[] = [
    {
      id: "edit-save",
      label: "Save",
      keys: APP_SHORTCUT_BINDINGS.editSave.keycaps,
    },
    {
      id: "edit-form-actions",
      label: "Jump to header actions",
      keys: APP_SHORTCUT_BINDINGS.editFormActions.keycaps,
    },
  ];

  if (options.hasMeetingLink) {
    rows.push({
      id: "edit-copy-meeting-link",
      label: "Copy meeting link",
      keys: APP_SHORTCUT_BINDINGS.editCopyMeetingLink.keycaps,
    });
  }

  if (options.isExistingEvent && !options.isReadOnly) {
    rows.push({
      id: "edit-duplicate",
      label: "Duplicate",
      keys: APP_SHORTCUT_BINDINGS.editDuplicate.keycaps,
    });
  }

  if (!options.isReadOnly) {
    rows.push({
      id: "edit-delete",
      label: "Delete",
      keys: APP_SHORTCUT_BINDINGS.editDelete.keycaps,
    });
  }

  if (options.showBookingFormActions) {
    rows.push(
      {
        id: "edit-cancel-meeting",
        label: "Cancel booked meeting",
        keys: APP_SHORTCUT_BINDINGS.editCancelMeeting.keycaps,
      },
      {
        id: "edit-reschedule-meeting",
        label: "Reschedule booked meeting",
        keys: APP_SHORTCUT_BINDINGS.editRescheduleMeeting.keycaps,
      },
    );
  }

  rows.push({
    id: "edit-close-form",
    label: "Close form",
    keys: APP_SHORTCUT_BINDINGS.createPlaceDiscard.keycaps,
  });

  return rows;
}
