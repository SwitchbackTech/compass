import { PlusIcon } from "@phosphor-icons/react";
import { type Dayjs } from "@core/util/date/dayjs";
import { onEventTargetVisibility } from "@web/common/utils/dom/event-target-visibility.util";
import {
  createAlldayDraft,
  createTimedDraft,
} from "@web/common/utils/draft/draft.util";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";

interface UseWeekCmdTasksArgs {
  isCurrentWeek: boolean;
  startOfView: Dayjs;
  endOfView: Dayjs;
}

/**
 * Week-specific "Common Tasks" for the command palette. Draft creation is
 * deferred until the clicked row unmounts via `onEventTargetVisibility` — see
 * PR #520 for why.
 */
export const useWeekCmdTasks = ({
  isCurrentWeek,
  startOfView,
  endOfView,
}: UseWeekCmdTasksArgs): CommandItem[] => {
  return [
    {
      id: "create-event",
      label: "Create Event",
      icon: PlusIcon,
      shortcut: "c",
      onClick: onEventTargetVisibility(() => {
        void createTimedDraft(isCurrentWeek, startOfView, "createShortcut");
      }),
    },
    {
      id: "create-allday-event",
      label: "Create All-Day Event",
      icon: PlusIcon,
      shortcut: "a",
      onClick: onEventTargetVisibility(() => {
        void createAlldayDraft(startOfView, endOfView, "createShortcut");
      }),
    },
  ];
};
