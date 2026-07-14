import { type RefObject, useCallback, useEffect, useRef } from "react";
import {
  CompassDOMEvents,
  compassEventEmitter,
} from "@web/common/utils/dom/event-emitter.util";
import { getCurrentMinute } from "@web/common/utils/grid/grid.util";
import { CALENDAR_TIMED_VISIBLE_HOURS } from "@web/layout/calendar-grid/calendarGrid.constants";

export const useDayCalendarScrollToNow = (
  mainGridRef: RefObject<HTMLElement | null>,
) => {
  const scrollToNow = useCallback(() => {
    const timedGrid = mainGridRef.current;
    if (!timedGrid) return;

    const minuteHeight =
      timedGrid.clientHeight / CALENDAR_TIMED_VISIBLE_HOURS / 60;
    timedGrid.scroll({
      behavior: "smooth",
      top: getCurrentMinute() * minuteHeight - 150,
    });
  }, [mainGridRef]);
  const scrollToNowRef = useRef(scrollToNow);

  useEffect(() => {
    if (mainGridRef.current) scrollToNow();
  }, [mainGridRef, scrollToNow]);

  useEffect(() => {
    scrollToNowRef.current = scrollToNow;
  }, [scrollToNow]);

  useEffect(() => {
    const handleScrollToNow = () => scrollToNowRef.current();
    compassEventEmitter.on(
      CompassDOMEvents.SCROLL_TO_NOW_LINE,
      handleScrollToNow,
    );
    return () => {
      compassEventEmitter.off(
        CompassDOMEvents.SCROLL_TO_NOW_LINE,
        handleScrollToNow,
      );
    };
  }, []);
};
