import { Dispatch, useCallback, useMemo } from "react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import { getUserId } from "@web/auth/auth.util";
import {
  CLASS_ALL_DAY_CALENDAR_EVENT,
  CLASS_MONTH_SOMEDAY_EVENT,
  CLASS_TIMED_CALENDAR_EVENT,
  CLASS_WEEK_SOMEDAY_EVENT,
  DATA_EVENT_ELEMENT_ID,
} from "@web/common/constants/web.constants";
import { useMousePosition } from "@web/common/hooks/useMousePosition";
import { selectEventById } from "@web/ducks/events/selectors/event.selectors";
import { store } from "@web/store";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import {
  getEventTimeFromPosition,
  toNearestFifteenMinutes,
} from "@web/views/Day/util/agenda/agenda.util";

export function useOpenEventForm({
  setDraft,
  setExisting,
}: {
  setExisting: Dispatch<React.SetStateAction<boolean>>;
  setDraft: Dispatch<React.SetStateAction<Schema_Event | null>>;
}) {
  const dateInView = useDateInView();
  const mousePosition = useMousePosition();

  const { element, mousePointRef, floating } = mousePosition;
  const { setReference } = floating?.refs ?? {};
  const { setOpenAtMousePosition } = mousePosition;
  const { isOverAllDayRow, isOverMainGrid, isOverSidebar } = mousePosition;
  const { isOverSomedayWeek, isOverSomedayMonth } = mousePosition;

  const eventClass = useMemo(() => {
    switch (true) {
      case isOverSomedayWeek:
        return CLASS_WEEK_SOMEDAY_EVENT;
      case isOverSomedayMonth:
        return CLASS_MONTH_SOMEDAY_EVENT;
      case isOverAllDayRow:
        return CLASS_ALL_DAY_CALENDAR_EVENT;
      case isOverMainGrid:
        return CLASS_TIMED_CALENDAR_EVENT;
      default:
        return null;
    }
  }, [isOverAllDayRow, isOverSomedayWeek, isOverSomedayMonth, isOverMainGrid]);

  const openEventForm = useCallback(
    async (create?: boolean) => {
      const user = await getUserId();

      if (!user) return;

      const event = element?.closest(`.${eventClass}`);
      const existingEventId = event?.getAttribute(DATA_EVENT_ELEMENT_ID);

      let draftEvent: Schema_Event;

      if (existingEventId && !create) {
        draftEvent = selectEventById(store.getState(), existingEventId);
        setExisting(true);
      } else {
        const now = dayjs();

        // we default to the nearest 15-minute event
        // until the week view is able to support arbitrary event durations
        let startTime: Dayjs = dayjs().minute(
          toNearestFifteenMinutes(now.minute()),
        );

        // make sure the clampedTime is in the future
        if (startTime.isBefore(now)) {
          startTime = startTime.add(15, "minutes");
        }

        let endTime: Dayjs = startTime.add(15, "minutes");

        if (isOverAllDayRow) {
          const date = dateInView.startOf("day");
          startTime = date;
          endTime = date.add(1, "day");
        } else if (isOverSomedayWeek || isOverSomedayMonth) {
          const now = dayjs();
          const date = dateInView.hour(now.hour()).minute(now.minute());
          startTime = date;
          endTime = date.add(15, "minutes");
        } else if (isOverMainGrid) {
          const boundingRect = mousePointRef?.getBoundingClientRect();
          const startTimeY = boundingRect?.top ?? 0;
          startTime = getEventTimeFromPosition(startTimeY, dateInView);
          endTime = startTime.add(15, "minutes");
        }

        draftEvent = {
          title: "",
          description: "",
          startDate: startTime.toISOString(),
          endDate: endTime.toISOString(),
          isAllDay: isOverAllDayRow,
          isSomeday: isOverSidebar,
          user,
          priority: Priorities.UNASSIGNED,
          origin: Origin.COMPASS,
        };

        setExisting(false);
      }

      setReference?.(mousePointRef);

      setDraft(draftEvent);
      setOpenAtMousePosition(true);
    },
    [
      element,
      eventClass,
      setReference,
      mousePointRef,
      setDraft,
      setExisting,
      setOpenAtMousePosition,
      isOverAllDayRow,
      isOverSomedayWeek,
      isOverSomedayMonth,
      isOverMainGrid,
      isOverSidebar,
      dateInView,
    ],
  );

  return openEventForm;
}
