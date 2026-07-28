import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { type GridEvent } from "@web/common/types/web.event.types";
import { repositionDraftByKeyboard } from "@web/common/utils/draft/reposition-draft-by-keyboard.util";
import { type EventMutationDependencies } from "@web/events/mutations/useEventMutations";
import { draftActions, useDraftStore } from "@web/events/stores/draft.store";
import { useGridEventEditShortcuts } from "@web/grid/shortcuts/useGridEventEditShortcuts";
import {
  getFirstVisibleDayGridEventTarget,
  getFocusedDayGridEventTarget,
  getHoveredDayGridEventTarget,
} from "@web/views/Day/interaction/targeting/day-event.targeting";

/**
 * Day-view edit shortcuts: Delete, Shift+arrows (nudge / day-move), and
 * Arrow keys to reposition an open draft. Shift+ArrowLeft/Right move a
 * focused event by one day and follow that day in the Day view.
 */
export function useDayEventNudgeShortcuts({
  allDayEvents = [],
  dependencies = {},
  navigateToDate,
  timedEvents,
}: {
  allDayEvents?: GridEvent[];
  dependencies?: EventMutationDependencies;
  /** Follow draft Left/Right moves so the draft stays on screen. */
  navigateToDate?: (date: Dayjs) => void;
  timedEvents: GridEvent[];
}) {
  useGridEventEditShortcuts({
    allDayEvents,
    dependencies,
    timedEvents,
    dayBoundary: {
      kind: "follow",
      onCrossed: (date) => navigateToDate?.(date),
    },
    targeting: {
      getFocused: getFocusedDayGridEventTarget,
      getHovered: getHoveredDayGridEventTarget,
      getFirstVisible: getFirstVisibleDayGridEventTarget,
    },
    repositionDraftByKey: (key) => {
      const { gridDraft, status } = useDraftStore.getState();
      const previousStart = gridDraft
        ? dayjs(gridDraft.values.schedule.start).startOf("day")
        : null;

      const nextDraft = repositionDraftByKeyboard({
        activity: status?.activity,
        draft: gridDraft,
        key,
      });
      if (!nextDraft) return false;

      draftActions.setGridDraft(nextDraft);

      const nextStart = dayjs(nextDraft.values.schedule.start).startOf("day");
      if (previousStart && !nextStart.isSame(previousStart, "day")) {
        navigateToDate?.(nextStart);
      }
      return true;
    },
  });
}
