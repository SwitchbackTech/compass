import {
  ArrowUDownLeftIcon,
  CalendarDotsIcon,
  CalendarIcon,
  HourglassSimpleIcon,
  type Icon,
  KeyboardIcon,
  CompassIcon,
} from "@phosphor-icons/react";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";
import {
  LIFE_SHORTCUT,
  VIEW_SHORTCUTS,
  type ViewName,
} from "@web/shortcuts/shortcuts.constants";

export type CommandPaletteViewName = ViewName;

interface GetNavigationCommandItemsArgs {
  currentView?: CommandPaletteViewName;
  onGoToToday?: () => void;
  onNavigateToView: (viewName: CommandPaletteViewName) => void;
  onShowShortcuts?: () => void;
  onShowWelcomeGuide?: () => void;
}

const commandPaletteViews: Record<
  CommandPaletteViewName,
  { icon: Icon; label: string; route: string; shortcut?: string }
> = {
  day: {
    icon: CalendarDotsIcon,
    label: VIEW_SHORTCUTS.day.label,
    route: VIEW_SHORTCUTS.day.route,
    shortcut: VIEW_SHORTCUTS.day.key,
  },
  week: {
    icon: CalendarIcon,
    label: VIEW_SHORTCUTS.week.label,
    route: VIEW_SHORTCUTS.week.route,
    shortcut: VIEW_SHORTCUTS.week.key,
  },
  life: {
    icon: HourglassSimpleIcon,
    label: LIFE_SHORTCUT.label,
    route: LIFE_SHORTCUT.route,
    shortcut: LIFE_SHORTCUT.key,
  },
};

const navigationViewOrder: CommandPaletteViewName[] = ["day", "week", "life"];

export const getNavigationViewRoute = (viewName: CommandPaletteViewName) =>
  commandPaletteViews[viewName].route;

export const getNavigationCommandItems = ({
  currentView,
  onGoToToday,
  onNavigateToView,
  onShowShortcuts,
  onShowWelcomeGuide,
}: GetNavigationCommandItemsArgs): CommandItem[] => {
  const calendarItems: CommandItem[] = [];

  if (onGoToToday) {
    calendarItems.push({
      id: "today",
      label: "Go to Today",
      icon: ArrowUDownLeftIcon,
      shortcut: "t",
      onClick: onGoToToday,
    });
  }

  calendarItems.push(
    ...navigationViewOrder
      .filter((viewName) => viewName !== currentView)
      .map((viewName) => {
        const view = commandPaletteViews[viewName];
        return {
          id: `go-to-${viewName}`,
          label: `Go to ${view.label}`,
          icon: view.icon,
          shortcut: view.shortcut,
          onClick: () => onNavigateToView(viewName),
        };
      }),
  );

  if (onShowShortcuts) {
    calendarItems.push({
      id: "show-shortcuts",
      label: "Show keyboard shortcuts",
      icon: KeyboardIcon,
      shortcut: "?",
      onClick: onShowShortcuts,
    });
  }

  if (onShowWelcomeGuide) {
    calendarItems.push({
      id: "show-welcome-guide",
      label: "Show welcome guide",
      icon: CompassIcon,
      onClick: onShowWelcomeGuide,
    });
  }

  return calendarItems;
};
