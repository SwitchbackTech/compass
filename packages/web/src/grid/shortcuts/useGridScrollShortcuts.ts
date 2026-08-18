import { scrollTimedGridByPage } from "@web/grid/shortcuts/scroll-timed-grid";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

const scrollGridFromShortcut = (
  direction: "up" | "down",
  event: KeyboardEvent,
) => {
  if (!scrollTimedGridByPage(direction)) return;

  event.preventDefault();
  event.stopPropagation();
};

/**
 * PageUp / PageDown always scroll the timed grid, even when focus is on an
 * event card or another non-grid control. Arrow keys stay reserved for
 * event focus; J/K stay reserved for day/week navigation.
 */
export function useGridScrollShortcuts() {
  useAppShortcut("PageUp", (event) => {
    scrollGridFromShortcut("up", event);
  });
  useAppShortcut("PageDown", (event) => {
    scrollGridFromShortcut("down", event);
  });
}
