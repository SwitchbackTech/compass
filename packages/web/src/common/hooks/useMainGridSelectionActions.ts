import { useCallback } from "react";
import { Priorities } from "@core/constants/core.constants";
import { getUserId } from "@web/auth/auth.util";
import {
  CursorItem,
  openFloatingAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { DomMovement } from "@web/common/utils/dom/event-emitter.util";
import { reorderGrid } from "@web/common/utils/dom/grid-organization.util";
import { getCalendarEventElementFromGrid } from "@web/common/utils/event/event.util";
import { setDraft, updateDraft } from "@web/store/events";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import { getEventTimeFromPosition } from "@web/views/Day/util/agenda/agenda.util";

export function useMainGridSelectionActions() {
  const dateInView = useDateInView();

  const calculateDateChanges = useCallback(
    (
      start: DomMovement["selectionStart"],
      delta: DomMovement["selectionStart"],
    ) => {
      if (!start || !delta) return {};

      const selectStart = getEventTimeFromPosition(start.clientY, dateInView);
      const currentTime = getEventTimeFromPosition(delta.clientY, dateInView);

      let startDate = selectStart;
      let endDate = currentTime;

      if (currentTime.isBefore(selectStart)) {
        startDate = currentTime;
        endDate = selectStart;
      }

      // Ensure at least 15 minutes duration
      if (endDate.diff(startDate, "minutes") < 15) {
        endDate = startDate.add(15, "minutes");
      }

      return { startDate: startDate.format(), endDate: endDate.format() };
    },
    [dateInView],
  );

  const onSelectionStart = useCallback(
    async (
      _id: string,
      start: DomMovement["selectionStart"],
      delta: DomMovement["selectionStart"],
    ) => {
      const user = await getUserId();

      if (!user) return;

      setDraft({
        _id,
        user,
        title: "",
        isAllDay: false,
        isSomeday: false,
        priority: Priorities.UNASSIGNED,
        ...calculateDateChanges(start, delta),
      });
    },
    [calculateDateChanges],
  );

  const onSelectionEnd = useCallback((_id: string) => {
    reorderGrid();

    const reference = getCalendarEventElementFromGrid(_id);

    if (!reference) return;

    openFloatingAtCursor({ nodeId: CursorItem.EventForm, reference });
  }, []);

  const onSelection = useCallback(
    (
      _id: string,
      start: DomMovement["selectionStart"],
      delta: DomMovement["selectionStart"],
    ) => {
      if (!start || !delta) return;

      updateDraft(calculateDateChanges(start, delta));
    },
    [calculateDateChanges],
  );

  return { onSelectionStart, onSelectionEnd, onSelection };
}
