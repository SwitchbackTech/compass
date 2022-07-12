import { useEffect } from "react";
import { Key } from "ts-keycode-enum";
import dayjs, { Dayjs } from "dayjs";
import { useDispatch } from "react-redux";
import { Categories_Event } from "@core/types/event.types";
import { isDrafting, roundToNext } from "@web/common/utils";
import { draftSlice } from "@web/ducks/events/event.slice";
import { GRID_TIME_STEP } from "@web/common/constants/grid.constants";

import { DateCalcs } from "../grid/useDateCalcs";

export const useShortcuts = (
  today: Dayjs,
  dateCalcs: DateCalcs,
  isCurrentWeek: boolean,
  startOfSelectedWeek: Dayjs,
  setWeek: React.Dispatch<React.SetStateAction<number>>
) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const _getStart = () => {
      if (isCurrentWeek) {
        // return today; //++
        return dayjs();
      } else {
        // return startOfSelectedWeek.hour(today.hour()); //++
        return startOfSelectedWeek.hour(dayjs().hour());
      }
    };

    const _createDraft = () => {
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
        [Key.C]: () => _createDraft(),
        [Key.T]: () => {
          _discardDraft();
          setWeek(today.week());
        },
        [Key.N]: () => {
          _discardDraft();
          setWeek((weekInView) => weekInView + 1);
        },
        [Key.P]: () => {
          _discardDraft();
          setWeek((weekInView) => weekInView - 1);
        },
        // [Key.S]: () =>
        //   dispatch(
        //     draftEventSlice.actions.start({
        //       eventType: Categories_Event.SOMEDAY,
        //     })
        //   ),
      } as { [key: number]: () => void };

      const handler = handlersByKey[e.which];
      if (!handler) return;

      setTimeout(handler);
    };

    document.addEventListener("keydown", keyDownHandler);

    return () => {
      document.removeEventListener("keydown", keyDownHandler);
    };
  }, [dateCalcs, dispatch, today, isCurrentWeek, startOfSelectedWeek, setWeek]);
};

/**********************
 * Delete once above works fully ++
 **********************/
/*
  useEffect(() => {
    const keyDownHandler = (e: KeyboardEvent) => {
      eventHandlers.setEditingEvent((editingEvent) => {
        if (editingEvent) return editingEvent;

        const handlersByKey = {
          [Key.C]: () =>
            eventHandlers.setEditingEvent({
              isAllDay: true,
              isOpen: true,
            } as Schema_GridEvent),
          [Key.T]: () => weekProps.handlers.setWeek(today.week()),
          [Key.N]: () => weekProps.handlers.setWeek((week) => week + 1),
          [Key.P]: () => weekProps.handlers.setWeek((week) => week - 1),
        } as { [key: number]: () => void };

        const handler = handlersByKey[e.which];
        if (!handler) return editingEvent;

        setTimeout(handler);

        return editingEvent;
      });
    };

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
