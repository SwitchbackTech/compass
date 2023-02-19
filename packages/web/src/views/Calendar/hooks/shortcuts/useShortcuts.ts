import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Key } from "ts-keycode-enum";
import dayjs, { Dayjs } from "dayjs";
import { useAppDispatch } from "@web/store/store.hooks";
import { Categories_Event } from "@core/types/event.types";
import { isDrafting, roundToNext } from "@web/common/utils";
import { draftSlice } from "@web/ducks/events/event.slice";
import { GRID_TIME_STEP } from "@web/views/Calendar/layout.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";

import { DateCalcs } from "../grid/useDateCalcs";
import { Util_Scroll } from "../grid/useScroll";
import { WeekProps } from "../useWeek";

export const useShortcuts = (
  today: Dayjs,
  dateCalcs: DateCalcs,
  isCurrentWeek: boolean,
  startOfSelectedWeek: Dayjs,
  util: WeekProps["util"],
  scrollUtil: Util_Scroll,
  toggleSidebar: () => void
) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const _getStart = () => {
      if (isCurrentWeek) {
        return dayjs();
      } else {
        return startOfSelectedWeek.hour(dayjs().hour());
      }
    };

    const _createSomedayDraft = () => {
      dispatch(
        draftSlice.actions.start({
          eventType: Categories_Event.SOMEDAY,
        })
      );
    };

    const _createTimedDraft = () => {
      const currentMinute = dayjs().minute();
      const nextMinuteInterval = roundToNext(currentMinute, GRID_TIME_STEP);

      const _start = _getStart().minute(nextMinuteInterval).second(0);
      const _end = _start.add(1, "hour");
      const startDate = _start.format();
      const endDate = _end.format();

      dispatch(
        draftSlice.actions.start({
          activity: "createShortcut",
          eventType: Categories_Event.TIMED,
          event: {
            startDate,
            endDate,
          },
        })
      );
    };

    const _discardDraft = () => {
      if (isDrafting()) {
        dispatch(draftSlice.actions.discard());
      }
    };

    const keyDownHandler = (e: KeyboardEvent) => {
      if (isDrafting()) return;

      const handlersByKey = {
        [Key.OpenBracket]: () => toggleSidebar(),
        [Key.C]: () => _createTimedDraft(),
        [Key.T]: () => {
          scrollUtil.scrollToNow();
          _discardDraft();
          util.goToToday();
        },
        [Key.J]: () => {
          _discardDraft();
          util.decrementWeek();
        },
        [Key.K]: () => {
          _discardDraft();
          util.incrementWeek();
        },
        [Key.S]: () => _createSomedayDraft(),
        [Key.Z]: () => {
          navigate(ROOT_ROUTES.LOGOUT);
        },
      } as { [key: number]: () => void };

      const handler = handlersByKey[e.which];
      if (!handler) return;

      setTimeout(handler);
    };

    document.addEventListener("keydown", keyDownHandler);

    return () => {
      document.removeEventListener("keydown", keyDownHandler);
    };
  }, [
    dateCalcs,
    dispatch,
    today,
    isCurrentWeek,
    navigate,
    startOfSelectedWeek,
    scrollUtil,
    toggleSidebar,
    util,
  ]);
};

/**********************
 * Delete once above works fully ++
 **********************/
//++
/*
    const mouseUpHandler = (e: MouseEvent) => {
      setTimeout(() => {
        eventHandlers.onEventsGridRelease(e as unknown as React.MouseEvent);
      });
    };

    const contextMenuHandler = (e: MouseEvent) => e.preventDefault();

    document.addEventListener("keydown", keyDownHandler);
    document.addEventListener("mouseup", mouseUpHandler);
    document.addEventListener("contextmenu", contextMenuHandler);

    return () => {
      document.addEventListener("contextmenu", contextMenuHandler);
      document.removeEventListener("keydown", keyDownHandler);
      document.removeEventListener("mouseup", mouseUpHandler);
    };
  }, [today, eventHandlers, weekProps.handlers]);
  */
