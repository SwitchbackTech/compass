import { KeyboardEvent, MouseEvent, useState } from "react";
import dayjs from "dayjs";
import { Priorities } from "@core/core.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  YEAR_MONTH_DAY_FORMAT,
  YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT,
} from "@web/common/constants/dates";
import { GRID_TIME_STEP } from "@web/common/constants/grid.constants";
import { roundToNext } from "@web/common/utils";

import { Status_DraftEvent } from "./draft.types";

const getDateStrByXY = (x: number, y: number) => "2022-06-03";

export const useDraftEvent = () => {
  //   const dispatch = useDispatch();

  const [event, setDraftEvent] = useState<Schema_GridEvent | null>(null);
  const [draftStatus, setDraftStatus] = useState<Status_DraftEvent | null>(
    null
  );
  const [modifiableDateField, setModifiableDateField] = useState<
    "startDate" | "endDate" | null
  >(null);

  const close = (e: MouseEvent | KeyboardEvent) => {
    if (event) setDraftEvent(null);
  };

  const convert = () => {
    console.log("converting to __ event: TBD");
  };

  const createAllDay = () => {
    const draft: Schema_GridEvent = {
      isAllDay: true,
      isOpen: true,
      // isSomeday: false,
      endDate: "2022-06-04",
      priority: Priorities.UNASSIGNED,
      startDate: "2022-06-03",
    };
    setDraftEvent(draft);
  };

  const createTimed = () => {
    if (event) {
      console.log("assuming you wanna close");
      setDraftEvent(null);
      return;
    }
    console.log("setting default draft");
    const currentMinute = dayjs().minute();
    const nextInterval = roundToNext(currentMinute, GRID_TIME_STEP);
    const start = dayjs().minute(nextInterval).second(0);
    const end = start.add(1, "hour");

    const draft: Schema_GridEvent = {
      isAllDay: false,
      isOpen: true,
      isSomeday: false,
      priority: Priorities.UNASSIGNED,
      startDate: start.format(),
      endDate: end.format(),
    };

    // setDraftEvent({ isEditing: true, title: "foz" });
    setDraftEvent(draft);
  };

  const drag = (e: MouseEvent) => {
    console.log("moving ...");
    if (draftStatus?.name === "dragging") {
      if (
        !draftStatus.hasMoved &&
        event?.startDate !== getDateStrByXY(e.clientX, e.clientY)
      ) {
        setDraftStatus((currentStatus) => ({
          ...currentStatus,
          name: "dragging",
          hasMoved: true,
        }));
      }

      onDrag(e);
      return;
    }

    if (!event || event.isOpen) {
      return;
    }

    const date = getDateStrByXY(e.clientX, e.clientY);

    setDraftEvent((currentDraft) => {
      if (!modifiableDateField) return currentDraft;

      const reversedField =
        modifiableDateField === "startDate" ? "endDate" : "startDate";

      let dateField = modifiableDateField;
      let startDate = currentDraft?.startDate;
      let endDate = currentDraft?.endDate;

      const modifyingDateDiff =
        (currentDraft &&
          Math.abs(dayjs(date).diff(currentDraft[reversedField], "minute"))) ||
        0;

      if (modifyingDateDiff < GRID_TIME_STEP) {
        return currentDraft;
      }

      if (
        modifiableDateField === "endDate" &&
        dayjs(date).isBefore(currentDraft?.startDate)
      ) {
        dateField = reversedField;
        endDate = currentDraft?.startDate;
        setModifiableDateField(dateField);
      }

      if (
        modifiableDateField === "startDate" &&
        dayjs(date).isAfter(currentDraft?.endDate)
      ) {
        dateField = reversedField;
        startDate = currentDraft?.endDate;
        setModifiableDateField(dateField);
      }

      return {
        ...currentDraft,
        endDate,
        startDate,
        priority: currentDraft?.priority,
        [dateField]: date,
      };
    });
  };

  const onDrag = (e: MouseEvent) => {
    setDraftEvent((currentDraft) => {
      const _initialStart = getDateStrByXY(
        e.clientX,
        // $$ get rid of mystery 2 - fixed the move bug...
        e.clientY - (draftStatus?.initialYOffset || 0) + 2
      );

      // $$ refactor getDateByMousePos to not return in the wrong format,
      // then refactor this to avoid re-parsing and formatting
      const startDate = currentDraft?.isAllDay
        ? dayjs(_initialStart).format(YEAR_MONTH_DAY_FORMAT)
        : _initialStart;

      const _format = currentDraft?.isAllDay
        ? YEAR_MONTH_DAY_FORMAT
        : YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT;
      const endDate = dayjs(_initialStart)
        .add(draftStatus?.initialMinutesDifference || 0, "minutes")
        .format(_format);

      return {
        ...currentDraft,
        startDate,
        endDate,
        priority: currentDraft?.priority || Priorities.UNASSIGNED,
      };
    });
  };

  const reset = () => {
    setDraftEvent(null);
    setDraftStatus(null);
  };

  return {
    draftEvent: event,
    draftHandlers: {
      close,
      convert,
      createAllDay,
      createTimed,
      drag,
      reset,
      setDraftEvent,
    },
  };
};
