import { type IconName, type JsonStructureItem } from "react-cmdk";
import { type Dayjs } from "@core/util/date/dayjs";
import {
  VIEW_SHORTCUTS,
  type ViewName,
} from "@web/common/constants/shortcuts.constants";

interface GetNavigationCommandItemsArgs {
  currentView: ViewName;
  onGoToToday: () => void;
  onNavigateToView: (viewName: ViewName) => void;
  today: Dayjs;
}

const viewIcons: Record<ViewName, IconName> = {
  day: "CalendarDaysIcon",
  week: "CalendarIcon",
};

const navigationViewOrder: ViewName[] = ["day", "week"];

export const getNavigationCommandItems = ({
  currentView,
  onGoToToday,
  onNavigateToView,
  today,
}: GetNavigationCommandItemsArgs): JsonStructureItem[] => [
  ...navigationViewOrder
    .filter((viewName) => viewName !== currentView)
    .map((viewName) => ({
      id: `go-to-${viewName}`,
      children: `Go to ${VIEW_SHORTCUTS[viewName].label} [${VIEW_SHORTCUTS[viewName].key}]`,
      icon: viewIcons[viewName],
      onClick: () => onNavigateToView(viewName),
    })),
  {
    id: "today",
    children: `Go to Today (${today.format("dddd, MMMM D")}) [t]`,
    icon: "ArrowUturnDownIcon",
    onClick: onGoToToday,
  },
];
