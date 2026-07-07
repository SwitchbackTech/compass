import { PlusIcon } from "@phosphor-icons/react";
import {
  SOMEDAY_MONTH_LIMIT_MSG,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";
import { Categories_Event } from "@core/types/event.types";
import { type Dayjs } from "@core/util/date/dayjs";
import { onEventTargetVisibility } from "@web/common/utils/dom/event-target-visibility.util";
import {
  createAlldayDraft,
  createTimedDraft,
} from "@web/common/utils/draft/draft.util";
import { createSomedayDraft } from "@web/common/utils/draft/someday.draft.util";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";
import { useSomedayEventViewModel } from "@web/events/queries/useSomedayEventsQuery";
import {
  selectIsSidebarOpen,
  useViewStore,
  viewActions,
} from "@web/events/stores/view.store";

interface UseWeekCmdTasksArgs {
  isCurrentWeek: boolean;
  startOfView: Dayjs;
  endOfView: Dayjs;
}

/**
 * Week-specific "Common Tasks" for the command palette. A hook (not a plain
 * function) because the someday-limit checks need `useSomedayEventViewModel`.
 * Draft creation is deferred until the clicked row unmounts via
 * `onEventTargetVisibility` — see PR #520 for why.
 */
export const useWeekCmdTasks = ({
  isCurrentWeek,
  startOfView,
  endOfView,
}: UseWeekCmdTasksArgs): CommandItem[] => {
  const { isAtMonthlyLimit, isAtWeeklyLimit } = useSomedayEventViewModel(
    startOfView,
    endOfView,
  );
  const isSidebarOpen = useViewStore(selectIsSidebarOpen);

  const handleCreateSomedayDraft = async (
    category: Categories_Event.SOMEDAY_WEEK | Categories_Event.SOMEDAY_MONTH,
  ) => {
    if (category === Categories_Event.SOMEDAY_WEEK && isAtWeeklyLimit) {
      alert(SOMEDAY_WEEK_LIMIT_MSG);
      return;
    }
    if (category === Categories_Event.SOMEDAY_MONTH && isAtMonthlyLimit) {
      alert(SOMEDAY_MONTH_LIMIT_MSG);
      return;
    }

    await createSomedayDraft(
      category,
      startOfView,
      endOfView,
      "createShortcut",
    );

    if (!isSidebarOpen) {
      viewActions.toggleSidebar();
    }
  };

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
    {
      id: "create-someday-week-event",
      label: "Create Week Event",
      icon: PlusIcon,
      shortcut: ["Shift", "W"],
      onClick: onEventTargetVisibility(() => {
        void handleCreateSomedayDraft(Categories_Event.SOMEDAY_WEEK);
      }),
    },
    {
      id: "create-someday-month-event",
      label: "Create Month Event",
      icon: PlusIcon,
      shortcut: ["Shift", "M"],
      onClick: onEventTargetVisibility(() => {
        void handleCreateSomedayDraft(Categories_Event.SOMEDAY_MONTH);
      }),
    },
  ];
};
