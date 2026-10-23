import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { parseUserDate } from "@web/common/utils/datetime/web.date.util";
import { formatEventFormDateLabel } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/eventFormDateField.util";

export type EventFormDateFieldClosedKey =
  | "ArrowDown"
  | "ArrowUp"
  | "Enter"
  | " ";

export type EventFormDateCalendarKey =
  | "ArrowLeft"
  | "ArrowRight"
  | "ArrowUp"
  | "ArrowDown"
  | "Enter"
  | " "
  | "Escape";

const CLOSED_FIELD_KEYS = new Set<string>([
  "ArrowDown",
  "ArrowUp",
  "Enter",
  " ",
]);

const CALENDAR_KEYS = new Set<string>([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Enter",
  " ",
  "Escape",
]);

export const isEventFormDateFieldClosedKey = (
  key: string,
): key is EventFormDateFieldClosedKey => CLOSED_FIELD_KEYS.has(key);

export const isEventFormDateCalendarKey = (
  key: string,
): key is EventFormDateCalendarKey => CALENDAR_KEYS.has(key);

type EventFormDateCalendarAction =
  | { kind: "moveCursor"; days: number }
  | { kind: "pickCursor" }
  | { kind: "close" };

const showsCommittedDay = (text: string, committedDate: Date) => {
  const parsed = parseUserDate(text.trim(), dayjs());
  return (
    parsed?.isSame(dayjs(committedDate), "day") === true &&
    text.trim() === formatEventFormDateLabel(committedDate)
  );
};

/** Closed-field keys (web `EventFormDateField.handleKeyDown`, Mac parity). */
export const closedFieldAction = (
  key: EventFormDateFieldClosedKey,
  options: {
    shiftKey: boolean;
    modKey: boolean;
    text: string;
    committedDate: Date;
  },
):
  | { kind: "openCalendar" }
  | { kind: "nudgeDays"; days: number }
  | { kind: "ignore" } => {
  switch (key) {
    case "ArrowDown": {
      if (options.shiftKey) return { kind: "nudgeDays", days: 7 };
      if (options.modKey) return { kind: "nudgeDays", days: 1 };
      return { kind: "openCalendar" };
    }
    case "ArrowUp":
      return { kind: "nudgeDays", days: options.shiftKey ? -7 : -1 };
    case "Enter":
      if (options.modKey) return { kind: "ignore" };
      return showsCommittedDay(options.text, options.committedDate)
        ? { kind: "openCalendar" }
        : { kind: "ignore" };
    case " ":
      return options.text === formatEventFormDateLabel(options.committedDate)
        ? { kind: "openCalendar" }
        : { kind: "ignore" };
  }
};

/** Open-calendar keys (web `react-datepicker` parity with Mac). */
export const calendarAction = (
  key: EventFormDateCalendarKey,
): EventFormDateCalendarAction => {
  switch (key) {
    case "ArrowLeft":
      return { kind: "moveCursor", days: -1 };
    case "ArrowRight":
      return { kind: "moveCursor", days: 1 };
    case "ArrowUp":
      return { kind: "moveCursor", days: -7 };
    case "ArrowDown":
      return { kind: "moveCursor", days: 7 };
    case "Enter":
    case " ":
      return { kind: "pickCursor" };
    case "Escape":
      return { kind: "close" };
  }
};

export const movePickerCursor = (
  cursor: Dayjs | null,
  anchor: Date,
  days: number,
): Dayjs => (cursor ?? dayjs(anchor)).add(days, "day");
