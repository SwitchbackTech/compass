import { ObjectId } from "bson";
import { PointerEvent, useCallback } from "react";
import { getEntity } from "@ngneat/elf-entities";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event, WithCompassId } from "@core/types/event.types";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import { getUserId } from "@web/auth/auth.util";
import {
  DATA_EVENT_ELEMENT_ID,
  ID_GRID_EVENTS_TIMED,
} from "@web/common/constants/web.constants";
import {
  getCursorPosition,
  isElementInViewport,
  isOverAllDayRow,
  isOverMainGrid,
  isOverSidebar,
  isOverSomedayMonth,
  isOverSomedayWeek,
} from "@web/common/context/mouse-position";
import {
  CursorItem,
  openFloatingAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { getElementAtPoint } from "@web/common/utils/dom/event-emitter.util";
import { getCalendarEventElementFromGrid } from "@web/common/utils/event/event.util";
import { eventsStore, getDraft, setDraft } from "@web/store/events";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import {
  getEventTimeFromPosition,
  roundToNearestFifteenWithinHour,
} from "@web/views/Day/util/agenda/agenda.util";
import {
  focusElement,
  getEventClass,
} from "@web/views/Day/util/agenda/focus.util";

const YMD = dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT;

export function useOpenEventForm() {
  const dateInView = useDateInView();

  const openEventForm = useCallback(
    async (e: PointerEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const { detail } = e;
      const defaultDetails = { id: undefined, create: false };
      const details = typeof detail === "object" ? detail : defaultDetails;
      const create = details?.create ?? false;
      const cursor = getCursorPosition();
      const user = await getUserId();

      if (!user) return;

      const previousDraft = eventsStore.query((s) => getDraft(s));
      const active = document.activeElement;
      const element = getElementAtPoint(cursor);
      const eventClass = `.${getEventClass(element)}`;
      const activeClass = `.${getEventClass(active)}`;
      const cursorEvent = element?.closest(eventClass);
      const event = cursorEvent ?? active?.closest(activeClass);
      const id = details?.id;
      const existingEventId = id ?? event?.getAttribute(DATA_EVENT_ELEMENT_ID);
      const draftId = new ObjectId().toString();
      const _id = create ? draftId : (existingEventId ?? draftId);
      const sameDraft = previousDraft?._id === _id;

      let draftEvent: WithCompassId<Schema_Event> | undefined = undefined;

      if (existingEventId && !create) {
        draftEvent = eventsStore.query(getEntity(existingEventId));
      }

      if (!draftEvent) {
        const now = dayjs();

        // we default to the nearest 15-minute event
        // until the week view is able to support arbitrary event durations
        let startTime: Dayjs = dayjs().minute(
          roundToNearestFifteenWithinHour(now.minute()),
        );

        // make sure the clampedTime is in the future
        if (startTime.isBefore(now)) {
          startTime = startTime.add(15, "minutes");
        }

        let endTime: Dayjs = startTime.add(15, "minutes");

        const isAllDay = isOverAllDayRow() || isOverAllDayRow(active);
        const somedayCursor = isOverSomedayWeek() || isOverSomedayMonth();
        const somedayActive = isOverSidebar() || isOverSidebar(active);
        const isSomeday = somedayCursor || somedayActive;

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

        if (!isAllDay && sameDraft) {
          startTime = dayjs(previousDraft?.startDate);
          endTime = dayjs(previousDraft?.endDate);
        }

        const update = sameDraft ? previousDraft : null;

        draftEvent = {
          ...update,
          _id,
          title: update?.title || "",
          description: update?.description || "",
          startDate: isAllDay ? startTime.format(YMD) : startTime.format(),
          endDate: isAllDay ? endTime.format(YMD) : endTime.format(),
          isAllDay,
          isSomeday,
          user,
          priority: update?.priority || Priorities.UNASSIGNED,
          origin: Origin.COMPASS,
        };
      }

      setDraft(draftEvent); // preview will now be available on calendar surface

      queueMicrotask(() => {
        const reference = getCalendarEventElementFromGrid(_id);

        if (reference) {
          const willScroll = !isElementInViewport(reference);

          if (willScroll) {
            const timedSurface = document.getElementById(ID_GRID_EVENTS_TIMED);

            focusElement(reference as HTMLElement);

            return timedSurface?.addEventListener(
              "scrollend",
              () =>
                openFloatingAtCursor({
                  reference,
                  nodeId: CursorItem.EventForm,
                }),
              { once: true },
            );
          } else {
            openFloatingAtCursor({ reference, nodeId: CursorItem.EventForm });
          }
        }
      });
    },
    [dateInView],
  );

  return openEventForm;
}
