import { NotePencilIcon, PlusIcon } from "@phosphor-icons/react";
import {
  CompassDOMEvents,
  compassEventEmitter,
} from "@web/common/utils/dom/event-emitter.util";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";
import {
  openEventFormCreateEvent,
  openEventFormEditEvent,
} from "@web/views/Day/interaction/dayCalendarFocus.util";

/**
 * Day-view "Common Tasks" for the command palette. These actions are static,
 * so a plain function suffices (no hook). The `queueMicrotask` wrappers defer
 * focus/DOM work until after the palette unmounts.
 */
export const getDayCmdTasks = (): CommandItem[] => [
  {
    id: "create-event",
    label: "Create event",
    icon: PlusIcon,
    onClick: () => queueMicrotask(openEventFormCreateEvent),
  },
  {
    id: "create-allday-event",
    label: "Create all-day event",
    icon: PlusIcon,
    shortcut: "a",
    onClick: () =>
      queueMicrotask(() =>
        compassEventEmitter.emit(CompassDOMEvents.CREATE_ALLDAY_DRAFT),
      ),
  },
  {
    id: "edit-event",
    label: "Edit event",
    icon: NotePencilIcon,
    shortcut: "m",
    onClick: () => queueMicrotask(openEventFormEditEvent),
  },
];
