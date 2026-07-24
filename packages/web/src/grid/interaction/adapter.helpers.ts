import {
  getSmartScrollFrame,
  type SmartScrollCache,
} from "@web/grid/interaction/math/smart-scroll";
import {
  type VisualPoint,
  type VisualRect,
} from "@web/grid/interaction/types/timed-drag.types";

/** Shared smart-scroll tuning used by Day and Week layout caches. */
export const SMART_SCROLL_BOTTOM_INSET_PX = 100;
export const SMART_SCROLL_SPEED_PX = 10;

export type SavedGridInteractionType =
  | "allDayDrag"
  | "allDayResize"
  | "timedDrag"
  | "timedResize";

export const getSavedEventOwnershipReason = (
  type: SavedGridInteractionType,
) => {
  switch (type) {
    case "allDayDrag":
      return "saved-all-day-drag";
    case "allDayResize":
      return "saved-all-day-resize";
    case "timedResize":
      return "saved-timed-resize";
    case "timedDrag":
      return "saved-timed-drag";
  }
};

export const getSavedEventInteractionCursor = (
  type: SavedGridInteractionType,
) => {
  switch (type) {
    case "allDayResize":
      return "col-resize";
    case "timedResize":
      return "row-resize";
    case "allDayDrag":
    case "timedDrag":
      return "move";
  }
};

export const readElementRect = (element: HTMLElement): VisualRect => {
  const rect = element.getBoundingClientRect();

  return {
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  };
};

/**
 * Applies one smart-scroll frame against a layout cache, mutating the scroll
 * container when needed. Returns the updated scrollTop so the caller can keep
 * its closed-over session state in sync.
 */
export const applySmartScroll = ({
  layout,
  pointer,
  scrollTop,
}: {
  layout: { smartScroll?: SmartScrollCache | null } | null;
  pointer: Pick<VisualPoint, "y">;
  scrollTop: number | null;
}): {
  isScrolling: boolean;
  scrollDeltaPx: number;
  scrollTop: number | null;
} => {
  if (!layout?.smartScroll || scrollTop === null) {
    return { isScrolling: false, scrollDeltaPx: 0, scrollTop };
  }

  let nextScrollTop = layout.smartScroll.element.scrollTop;

  const frame = getSmartScrollFrame({
    cache: layout.smartScroll,
    pointerY: pointer.y,
    scrollTop: nextScrollTop,
  });

  if (frame.scrollTop !== nextScrollTop) {
    layout.smartScroll.element.scrollTop = frame.scrollTop;
    nextScrollTop = frame.scrollTop;
  }

  return {
    isScrolling: frame.velocityPx !== 0,
    scrollDeltaPx: nextScrollTop - layout.smartScroll.initialScrollTop,
    scrollTop: nextScrollTop,
  };
};
