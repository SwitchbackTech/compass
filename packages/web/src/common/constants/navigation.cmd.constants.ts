import {
  ArrowUDownLeftIcon,
  CalendarDotsIcon,
  CalendarIcon,
  type Icon,
} from "@phosphor-icons/react";
import { type Dayjs } from "@core/util/date/dayjs";
import {
  VIEW_SHORTCUTS,
  type ViewName,
} from "@web/common/constants/shortcuts.constants";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";

interface GetNavigationCommandItemsArgs {
  currentView: ViewName;
  onGoToToday: () => void;
  onNavigateToView: (viewName: ViewName) => void;
  today: Dayjs;
}

const viewIcons: Record<ViewName, Icon> = {
  day: CalendarDotsIcon,
  week: CalendarIcon,
};

const navigationViewOrder: ViewName[] = ["day", "week"];

export const getNavigationCommandItems = ({
  currentView,
  onGoToToday,
  onNavigateToView,
  today,
}: GetNavigationCommandItemsArgs): CommandItem[] => [
  ...navigationViewOrder
    .filter((viewName) => viewName !== currentView)
    .map((viewName) => ({
      id: `go-to-${viewName}`,
      label: `Go to ${VIEW_SHORTCUTS[viewName].label} [${VIEW_SHORTCUTS[viewName].key}]`,
      icon: viewIcons[viewName],
      onClick: () => onNavigateToView(viewName),
    })),
  {
    id: "today",
    label: `Go to Today (${today.format("dddd, MMMM D")}) [t]`,
    icon: ArrowUDownLeftIcon,
    onClick: onGoToToday,
  },
];
