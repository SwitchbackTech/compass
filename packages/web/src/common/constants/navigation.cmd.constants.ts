import {
  ArrowUDownLeftIcon,
  CalendarDotsIcon,
  CalendarIcon,
  type Icon,
  KeyboardIcon,
} from "@phosphor-icons/react";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";
import {
  VIEW_SHORTCUTS,
  type ViewName,
} from "@web/shortcuts/shortcuts.constants";

interface GetNavigationCommandItemsArgs {
  onGoToToday: () => void;
  onNavigateToView: (viewName: ViewName) => void;
  onShowShortcuts: () => void;
}

const viewIcons: Record<ViewName, Icon> = {
  day: CalendarDotsIcon,
  week: CalendarIcon,
};

const navigationViewOrder: ViewName[] = ["day", "week"];

export const getNavigationCommandItems = ({
  onGoToToday,
  onNavigateToView,
  onShowShortcuts,
}: GetNavigationCommandItemsArgs): CommandItem[] => [
  {
    id: "today",
    label: "Go to Today",
    icon: ArrowUDownLeftIcon,
    shortcut: "t",
    onClick: onGoToToday,
  },
  ...navigationViewOrder.map((viewName) => ({
    id: `go-to-${viewName}`,
    label: `Go to ${VIEW_SHORTCUTS[viewName].label}`,
    icon: viewIcons[viewName],
    shortcut: VIEW_SHORTCUTS[viewName].key,
    onClick: () => onNavigateToView(viewName),
  })),
  {
    id: "show-shortcuts",
    label: "Show Shortcuts",
    icon: KeyboardIcon,
    shortcut: "?",
    onClick: onShowShortcuts,
  },
];
