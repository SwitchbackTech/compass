import {
  DATA_TIMED_GRID_ROW,
  ID_ALLDAY_COLUMNS,
  ID_GRID_COLUMNS_TIMED,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";

/** posthog-js skips rageclick detection on elements with this class. */
export const CALENDAR_GRID_PH_NO_RAGECLICK_CLASS = "ph-no-rageclick";

/** Element ids that mark the timed or all-day grid. */
const GRID_ELEMENT_IDS = [
  ID_GRID_MAIN,
  ID_GRID_COLUMNS_TIMED,
  ID_ALLDAY_COLUMNS,
] as const;

/** Attributes carried only by grid columns and rows. */
const GRID_ELEMENT_ATTRS = ["data-grid-date", DATA_TIMED_GRID_ROW] as const;

/**
 * `$elements_chain` serializes ids and attribute names inline, so one
 * substring match over the same markers covers that shape.
 */
const GRID_CHAIN_MARKERS = [...GRID_ELEMENT_IDS, ...GRID_ELEMENT_ATTRS];

/** Dead-click autocapture ignore list (see posthog `capture_dead_clicks`). */
export const CALENDAR_GRID_DEAD_CLICK_IGNORE_SELECTORS = [
  ...GRID_ELEMENT_IDS.map((id) => `#${id}`),
  ...GRID_ELEMENT_ATTRS.map((attr) => `[${attr}]`),
];

/** True when autocapture element metadata points at the timed or all-day grid. */
export function isPosthogEventOnCalendarGrid(
  properties: Record<string, unknown> | undefined,
): boolean {
  if (!properties) return false;

  const chain = properties.$elements_chain;
  if (typeof chain === "string" && chain.length > 0) {
    if (GRID_CHAIN_MARKERS.some((marker) => chain.includes(marker)))
      return true;
  }

  const elements = properties.$elements;
  if (!Array.isArray(elements)) return false;

  return elements.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const element = entry as Record<string, unknown>;
    if (GRID_ELEMENT_IDS.some((id) => element.attr__id === id)) return true;
    return GRID_ELEMENT_ATTRS.some(
      (attr) => element[`attr__${attr}`] !== undefined,
    );
  });
}
