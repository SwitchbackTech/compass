import { ObjectId } from "bson";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";

export const userId = new ObjectId().toString();
export const newsletterId = new ObjectId().toString();
const walkDogId = new ObjectId().toString();

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
    _id: new ObjectId().toString(),
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
    _id: new ObjectId().toString(),
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
    _id: new ObjectId().toString(),
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
    _id: new ObjectId().toString(),
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
    _id: new ObjectId().toString(),
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
    _id: new ObjectId().toString(),
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
