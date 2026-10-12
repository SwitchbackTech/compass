import {
  DATA_TIMED_GRID_ROW,
  ID_ALLDAY_COLUMNS,
  ID_GRID_COLUMNS_TIMED,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";

/** posthog-js skips rageclick detection on elements with this class. */
export const CALENDAR_GRID_PH_NO_RAGECLICK_CLASS = "ph-no-rageclick";

/** Dead-click autocapture ignore list (see posthog `capture_dead_clicks`). */
export const CALENDAR_GRID_DEAD_CLICK_IGNORE_SELECTORS = [
  `#${ID_GRID_MAIN}`,
  `#${ID_GRID_COLUMNS_TIMED}`,
  `#${ID_ALLDAY_COLUMNS}`,
  "[data-grid-date]",
  `[${DATA_TIMED_GRID_ROW}]`,
] as const;

const GRID_CHAIN_MARKERS = [
  `#${ID_GRID_MAIN}`,
  ID_GRID_MAIN,
  ID_GRID_COLUMNS_TIMED,
  ID_ALLDAY_COLUMNS,
  "data-grid-date",
  DATA_TIMED_GRID_ROW,
] as const;

/** True when autocapture element metadata points at the timed or all-day grid. */
export function isPosthogEventOnCalendarGrid(
  properties: Record<string, unknown> | undefined,
): boolean {
  if (!properties) return false;

  const chain = properties.$elements_chain;
  if (typeof chain === "string" && chain.length > 0) {
    if (GRID_CHAIN_MARKERS.some((marker) => chain.includes(marker))) {
      return true;
    }
  }

  const elements = properties.$elements;
  if (Array.isArray(elements)) {
    for (const entry of elements) {
      if (!entry || typeof entry !== "object") continue;
      const attrs = (entry as { attr__id?: unknown }).attr__id;
      if (attrs === ID_GRID_MAIN || attrs === ID_GRID_COLUMNS_TIMED) {
        return true;
      }
      const gridDate = (entry as { "attr__data-grid-date"?: unknown })[
        "attr__data-grid-date"
      ];
      if (gridDate !== undefined) return true;
    }
  }

  return false;
}
