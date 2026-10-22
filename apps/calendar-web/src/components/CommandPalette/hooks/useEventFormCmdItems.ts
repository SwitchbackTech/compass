import { ArrowsClockwise } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { CalendarX } from "@phosphor-icons/react/dist/csr/CalendarX";
import { Copy } from "@phosphor-icons/react/dist/csr/Copy";
import { FloppyDisk } from "@phosphor-icons/react/dist/csr/FloppyDisk";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { listEventFormActions } from "@core/shortcuts/event-form-actions";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";
import {
  selectIsEventFormOpen,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { useEventFormCmdStore } from "@web/views/Forms/EventForm/event-form-cmd.store";

const ICON_BY_ID: Partial<Record<string, CommandItem["icon"]>> = {
  "edit-save": FloppyDisk,
  "edit-copy-meeting-link": Copy,
  "edit-duplicate": Copy,
  "edit-delete": Trash,
  "edit-close-form": X,
  "edit-cancel-meeting": CalendarX,
  "edit-reschedule-meeting": ArrowsClockwise,
};

/**
 * Event-form actions for the command palette. Handlers are registered by
 * EventForm while it is mounted.
 */
export function useEventFormCmdItems(): CommandItem[] {
  const isFormOpen = useDraftStore(selectIsEventFormOpen);
  const {
    handlers,
    hasMeetingLink,
    isExistingEvent,
    isReadOnly,
    isScheduleLocked,
    showBookingFormActions,
  } = useEventFormCmdStore();

  if (!isFormOpen || !handlers) {
    return [];
  }

  const onClickById: Record<string, () => void> = {
    "edit-save": handlers.onSave,
    "edit-form-actions": handlers.onJumpToActions,
    "edit-toggle-all-day": () => handlers.onToggleAllDay?.(),
    "edit-copy-meeting-link": handlers.onCopyMeetingLink,
    "edit-duplicate": handlers.onDuplicate,
    "edit-delete": handlers.onDelete,
    "edit-cancel-meeting": () => handlers.onCancelMeeting?.(),
    "edit-reschedule-meeting": () => handlers.onRescheduleMeeting?.(),
    "edit-close-form": handlers.onClose,
  };

  return listEventFormActions({
    hasMeetingLink,
    isExistingEvent,
    isReadOnly,
    isScheduleLocked,
    showBookingFormActions,
  }).flatMap((entry) => {
    const onClick = onClickById[entry.id];
    if (!onClick) return [];

    return [
      {
        id: `event-form-${entry.id}`,
        label: entry.label,
        icon: ICON_BY_ID[entry.id] ?? FloppyDisk,
        shortcut: [...entry.keys],
        keywords: ["event form", "sidebar", entry.label.toLowerCase()],
        onClick: () => queueMicrotask(onClick),
      },
    ];
  });
}
