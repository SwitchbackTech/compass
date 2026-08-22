import {
  scrollTimedGrid,
  type TimedGridScrollUnit,
} from "@web/grid/shortcuts/scroll-timed-grid";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

const scrollGridFromShortcut = (
  direction: "up" | "down",
  unit: TimedGridScrollUnit,
  event: KeyboardEvent,
) => {
  if (!scrollTimedGrid(direction, unit)) return;

  event.preventDefault();
  event.stopPropagation();
};

/**
 * PageUp / PageDown page the timed grid by one viewport; Alt+ArrowUp /
 * Alt+ArrowDown pan it by one hour. Both fire even when focus is on an
 * event card or another non-grid control. Bare arrows stay reserved for
 * event focus; J/K stay reserved for day/week navigation.
 */
export function useGridScrollShortcuts() {
  useAppShortcut("PageUp", (event) => {
    scrollGridFromShortcut("up", "page", event);
  });
  useAppShortcut("PageDown", (event) => {
    scrollGridFromShortcut("down", "page", event);
  });
  useAppShortcut("Alt+ArrowUp", (event) => {
    scrollGridFromShortcut("up", "hour", event);
  });
  useAppShortcut("Alt+ArrowDown", (event) => {
    scrollGridFromShortcut("down", "hour", event);
  });
}
