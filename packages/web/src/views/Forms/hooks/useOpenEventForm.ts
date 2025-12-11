import { Dispatch, useCallback } from "react";
import { ReferenceType } from "@floating-ui/react";
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
import { getElementAtPoint } from "@web/common/utils/dom-events/event-emitter.util";
import { selectEventById } from "@web/ducks/events/selectors/event.selectors";
import { store } from "@web/store";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import {
  getEventTimeFromPosition,
  toNearestFifteenMinutes,
} from "@web/views/Day/util/agenda/agenda.util";
import { getEventClass } from "@web/views/Day/util/agenda/focus.util";

export function useOpenEventForm({
  setDraft,
  setExisting,
  setReference,
  setOpenAtMousePosition,
}: {
  setReference: (node: ReferenceType | null) => void;
  setExisting: Dispatch<React.SetStateAction<boolean>>;
  setDraft: Dispatch<React.SetStateAction<Schema_Event | null>>;
  setOpenAtMousePosition: Dispatch<React.SetStateAction<boolean>>;
}) {
  const dateInView = useDateInView();

  const openEventForm = useCallback(
    async (create = false, cursor = getCursorPosition()) => {
      const user = await getUserId();

      if (!user) return;

      const { element } = getElementAtPoint(cursor);
      const eventClass = getEventClass(element);
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

        if (isOverAllDayRow()) {
          const date = dateInView.startOf("day");
          startTime = date;
          endTime = date.add(1, "day");
        } else if (isOverSomedayWeek() || isOverSomedayMonth()) {
          const now = dayjs();
          const date = dateInView.hour(now.hour()).minute(now.minute());
          startTime = date;
          endTime = date.add(15, "minutes");
        } else if (isOverMainGrid()) {
          const startTimeY = cursor.clientY;
          startTime = getEventTimeFromPosition(startTimeY, dateInView);
          endTime = startTime.add(15, "minutes");
        }

        draftEvent = {
          title: "",
          description: "",
          startDate: startTime.toISOString(),
          endDate: endTime.toISOString(),
          isAllDay: isOverAllDayRow(),
          isSomeday: isOverSidebar(),
          user,
          priority: Priorities.UNASSIGNED,
          origin: Origin.COMPASS,
        };

        setExisting(false);
      }

      setReference?.(getMousePointRef(cursor));

      setDraft(draftEvent);
      setOpenAtMousePosition(true);
    },
    [setReference, setDraft, setOpenAtMousePosition, setExisting, dateInView],
  );

  return openEventForm;
}
