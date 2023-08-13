import dayjs from "dayjs";
import { YEAR_MONTH_DAY_FORMAT } from "../../constants/date.constants";
import { Schema_Event } from "../../types/event.types";

const userId = "user1";
export const newsletterId = "64c266a87866ebd0a2bda49b";
const walkDogId = "77c777a87866ebd0a2bda49b";

const today = dayjs();

export const newsletterRecurrences: Schema_Event[] = [
  {
    _id: newsletterId,
    user: userId,
    title: "Send Newsletter | Base | Past",
    isSomeday: true,
    startDate: today.add(-20, "days").format(YEAR_MONTH_DAY_FORMAT),
    endDate: today.add(-13, "days").format(YEAR_MONTH_DAY_FORMAT),
  },
  {
    _id: "instance1",
    user: userId,
    title: "Send Newsletter | Instance | Past",
    isSomeday: true,
    startDate: today.add(-6, "days").format(YEAR_MONTH_DAY_FORMAT),
    endDate: today.add(-13, "days").format(YEAR_MONTH_DAY_FORMAT),
    recurrence: {
      rule: ["RRULE:FREQ=WEEKLY;COUNT=16;INTERVAL=1;BYDAY=SU"],
      eventId: newsletterId,
    },
  },
  {
    _id: "instance2a",
    user: userId,
    title: "Send Newsletter | Instance2 | Starts Today",
    isSomeday: true,
    startDate: today.format(YEAR_MONTH_DAY_FORMAT),
    endDate: today.add(6, "days").format(YEAR_MONTH_DAY_FORMAT),
    recurrence: {
      rule: ["RRULE:FREQ=WEEKLY;COUNT=16;INTERVAL=1;BYDAY=SU"],
      eventId: newsletterId,
    },
  },
  {
    _id: "instance2b",
    user: userId,
    title: "Send Newsletter | Instance2 | Ends Today",
    isSomeday: true,
    startDate: today.add(-6, "days").format(YEAR_MONTH_DAY_FORMAT),
    endDate: today.format(YEAR_MONTH_DAY_FORMAT),
    recurrence: {
      rule: ["RRULE:FREQ=WEEKLY;COUNT=16;INTERVAL=1;BYDAY=SU"],
      eventId: newsletterId,
    },
  },
  {
    _id: "instance3",
    user: userId,
    title: "Send Newsletter | Instance3 | Future1",
    isSomeday: true,
    startDate: today.add(6, "days").format(YEAR_MONTH_DAY_FORMAT),
    endDate: today.add(13, "days").format(YEAR_MONTH_DAY_FORMAT),
    recurrence: {
      rule: ["RRULE:FREQ=WEEKLY;COUNT=16;INTERVAL=1;BYDAY=SU"],
      eventId: newsletterId,
    },
  },
  {
    _id: "instance4",
    user: userId,
    title: "Send Newsletter | Instance4 | Future2",
    isSomeday: true,
    startDate: today.add(12, "days").format(YEAR_MONTH_DAY_FORMAT),
    endDate: today.add(19, "days").format(YEAR_MONTH_DAY_FORMAT),
    recurrence: {
      rule: ["RRULE:FREQ=WEEKLY;COUNT=16;INTERVAL=1;BYDAY=SU"],
      eventId: newsletterId,
    },
  },
];

const walkDogRecurrences: Schema_Event[] = [
  {
    _id: walkDogId,
    user: userId,
    title: "Send Newsletter | Base | Past",
    isSomeday: true,
    startDate: today.add(-20, "days").format(YEAR_MONTH_DAY_FORMAT),
    endDate: today.add(-13, "days").format(YEAR_MONTH_DAY_FORMAT),
  },
  {
    _id: "walkdog-instance1",
    user: userId,
    title: "Send Newsletter | Instance | Past",
    isSomeday: true,
    startDate: today.add(1, "days").format(YEAR_MONTH_DAY_FORMAT),
    endDate: today.add(2, "days").format(YEAR_MONTH_DAY_FORMAT),
    recurrence: {
      rule: ["RRULE:FREQ=DAILY;COUNT=16;INTERVAL=6BYDAY=SU"],
      eventId: newsletterId,
    },
  },
];

export const mockSomedayRecurrences = [
  ...newsletterRecurrences,
  ...walkDogRecurrences,
];
