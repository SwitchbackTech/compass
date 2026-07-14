import { NotePencilIcon, PlusIcon } from "@phosphor-icons/react";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";
import { emitDayViewCommand } from "@web/views/Day/day-view-bus";
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
      queueMicrotask(() => emitDayViewCommand("CREATE_ALLDAY_DRAFT")),
  },
  {
    id: "edit-event",
    label: "Edit event",
    icon: NotePencilIcon,
    shortcut: "m",
    onClick: () => queueMicrotask(openEventFormEditEvent),
  },
];
