/**
 * Utility functions for working with dates and times that are
 * specific to the web app.
 * Datetime utilities that apply to both backend and web
 * should go in @core/
 */
import dayjs, { Dayjs } from "dayjs";
import { YMDHAM_FORMAT } from "@core/constants/date.constants";
import {
  Params_DateChange,
  Params_TimeChange,
} from "@web/common/types/util.types";

export const shouldAdjustComplimentDate = (
  changed: "start" | "end",
  vals: Params_DateChange,
) => {
  const { start, end } = vals;
  const _start = dayjs(start);
  const _end = dayjs(end);

  let shouldAdjust = false;
  let compliment = start;

  if (changed === "start") {
    shouldAdjust = _start.isAfter(_end);
    if (shouldAdjust) {
      compliment = start;
    }
  }

  if (changed === "end") {
    shouldAdjust = _end.isBefore(_start);

    if (shouldAdjust) {
      compliment = end;
    }
  }

  return { shouldAdjust, compliment };
};

export const shouldAdjustComplimentTime = (
  changed: "start" | "end",
  vals: Params_TimeChange,
) => {
  let shouldAdjust: boolean;
  let duration: number;
  let step: number;
  let compliment: Dayjs;

  const { oldStart, oldEnd, start, end } = vals;

  const _start = dayjs(`2000-01-01 ${start}`, YMDHAM_FORMAT);
  const _end = dayjs(`2000-01-01 ${end}`, YMDHAM_FORMAT);
  const isSame = _start.isSame(_end);

  if (changed === "start") {
    shouldAdjust = _start.isAfter(_end) || isSame;

    if (shouldAdjust) {
      const _oldStart = dayjs(`2000-01-01 ${oldStart}`, YMDHAM_FORMAT);
      const _oldEnd = dayjs(`2000-01-01 ${oldEnd}`, YMDHAM_FORMAT);
      duration = Math.abs(_oldStart.diff(_oldEnd, "minutes"));

      step = Math.abs(_start.diff(_end, "minutes"));

      compliment = dayjs(`2000-01-01 ${end}`, YMDHAM_FORMAT);
    }
  }

  if (changed === "end") {
    shouldAdjust = _end.isBefore(_start) || isSame;

    if (shouldAdjust) {
      const _oldStart = dayjs(`2000-01-01 ${oldStart}`, YMDHAM_FORMAT);
      const _oldEnd = dayjs(`2000-01-01 ${oldEnd}`, YMDHAM_FORMAT);
      duration = Math.abs(_oldStart.diff(_oldEnd, "minutes"));

      step = Math.abs(_start.diff(_end, "minutes"));

      compliment = dayjs(`2000-01-01 ${start}`, YMDHAM_FORMAT);
    }
  }

  const adjustment = duration + step;

  return { shouldAdjust, adjustment, compliment };
};
