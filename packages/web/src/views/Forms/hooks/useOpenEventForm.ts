import { Dispatch, SetStateAction, useCallback } from "react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import { getUserId } from "@web/auth/auth.util";
import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import {
  getCursorPosition,
  getMousePointRef,
  isOverAllDayRow,
  isOverMainGrid,
  isOverSidebar,
  isOverSomedayMonth,
  isOverSomedayWeek,
} from "@web/common/context/mouse-position";
import { useOpenAtCursor } from "@web/common/hooks/useOpenAtCursor";
import { getElementAtPoint } from "@web/common/utils/dom/event-emitter.util";
import { selectEventById } from "@web/ducks/events/selectors/event.selectors";
import { store } from "@web/store";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import {
  getEventTimeFromPosition,
  toNearestFifteenMinutes,
} from "@web/views/Day/util/agenda/agenda.util";
import { getEventClass } from "@web/views/Day/util/agenda/focus.util";
import { CursorItem } from "../../../common/context/open-at-cursor";

export function useOpenEventForm({
  setDraft,
  setExisting,
}: {
  setExisting: Dispatch<SetStateAction<boolean>>;
  setDraft: Dispatch<SetStateAction<Schema_Event | null>>;
}) {
  const dateInView = useDateInView();
  const { setNodeId, setPlacement, floating } = useOpenAtCursor();
  const { setReference } = floating.refs;

  const openEventForm = useCallback(
    async (create = false, cursor = getCursorPosition()) => {
      const user = await getUserId();

      if (!user) return;

      const active = document.activeElement;
      const element = getElementAtPoint(cursor);
      const eventClass = getEventClass(element);
      const activeClass = getEventClass(active);
      const cursorEvent = element?.closest(`.${eventClass}`);
      const event = cursorEvent ?? active?.closest(`.${activeClass}`);
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

        const isAllDay = isOverAllDayRow() || isOverAllDayRow(active);
        const somedayCursor = isOverSomedayWeek() || isOverSomedayMonth();
        const somedayActive = isOverSidebar(active) || isOverSidebar(active);
        const isSomeday = somedayCursor || somedayActive;
        const YMD = dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT;

        if (isAllDay) {
          const date = dateInView.startOf("day");
          startTime = date;
          endTime = date.add(1, "day");
        } else if (isSomeday) {
          const now = dayjs();
          const date = dateInView.hour(now.hour()).minute(now.minute());
          startTime = date;
          endTime = date.add(15, "minutes");
        } else if (isOverMainGrid() || isOverMainGrid(active)) {
          const startTimeY = cursor.clientY;
          startTime = getEventTimeFromPosition(startTimeY, dateInView);
          endTime = startTime.add(15, "minutes");
        }

        draftEvent = {
          title: "",
          description: "",
          startDate: isAllDay ? startTime.format(YMD) : startTime.toISOString(),
          endDate: isAllDay ? endTime.format(YMD) : endTime.toISOString(),
          isAllDay,
          isSomeday,
          user,
          priority: Priorities.UNASSIGNED,
          origin: Origin.COMPASS,
        };

        setExisting(false);
      }

      setPlacement("right-start");
      setReference?.(getMousePointRef(cursor));
      setDraft(draftEvent);
      setNodeId(CursorItem.EventForm);
    },
    [setReference, setPlacement, setDraft, setNodeId, setExisting, dateInView],
  );

  return openEventForm;
}
