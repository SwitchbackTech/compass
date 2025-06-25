import dayjs from "dayjs";
import { FORMAT } from "@core/util/date/date.util";

type TimeConfig = {
  days?: number;
  hours?: number;
  minutes?: number;
};

function getDateTime(now: dayjs.Dayjs, config: TimeConfig = {}) {
  let date = now.startOf("week");
  if (config.days) date = date.add(config.days, "day");
  if (config.hours) date = date.hour(config.hours);
  if (config.minutes) date = date.minute(config.minutes);
  return date.format(FORMAT.RFC3339_OFFSET.value);
}

export type EventTemplate = {
  title?: string;
  description?: string;
  isSomeday: boolean;
  isAllDay: boolean;
  count: number;
  start: (now: dayjs.Dayjs) => string;
  end: (now: dayjs.Dayjs) => string;
  recurrence?: {
    rule: string[];
  };
};

const templates: EventTemplate[] = [
  // Monthly someday events template (will create 8)
  {
    isSomeday: true,
    isAllDay: false,
    count: 8,
    start: (now) => now.startOf("month").format(FORMAT.RFC3339_OFFSET.value),
    end: (now) => now.endOf("month").format(FORMAT.RFC3339_OFFSET.value),
  },
  // Weekly someday events template (will create 8)
  {
    isSomeday: true,
    isAllDay: false,
    count: 8,
    start: (now) => now.startOf("week").format(FORMAT.RFC3339_OFFSET.value),
    end: (now) => now.endOf("week").format(FORMAT.RFC3339_OFFSET.value),
  },
  // 4-day all-day event
  {
    title: "🏕️ UX Conference",
    description: "A special conference lasting four days",
    isSomeday: false,
    isAllDay: true,
    count: 1,
    start: (now) => getDateTime(now),
    end: (now) => getDateTime(now, { days: 4 }),
  },
  // 1-day all-day event
  {
    title: "🍿 State fair w/family",
    description: "A fun day at the state fair with family",
    isSomeday: false,
    isAllDay: true,
    count: 1,
    start: (now) => getDateTime(now, { days: 6 }),
    end: (now) => getDateTime(now, { days: 6, hours: 23, minutes: 59 }),
  },
  // 1-hour recurring event (Mon, Wed, Fri)
  {
    title: "🏃 Run",
    description: "A recurring 1-hour event from 11pm to 12pm every day",
    isSomeday: false,
    isAllDay: false,
    count: 1,
    start: (now) => getDateTime(now, { hours: 11, minutes: 0 }),
    end: (now) => getDateTime(now, { hours: 12, minutes: 0 }),
    recurrence: {
      rule: ["RRULE:FREQ=DAILY;COUNT=7;INTERVAL=1"],
    },
  },
  // 2-hour recurring event (every day)
  {
    title: "☁️ Deep Work",
    description: "A recurring 2-hour event from 12pm to 2pm every day",
    isSomeday: false,
    isAllDay: false,
    count: 1,
    start: (now) => getDateTime(now, { hours: 12, minutes: 0 }),
    end: (now) => getDateTime(now, { hours: 14, minutes: 0 }),
    recurrence: {
      rule: ["RRULE:FREQ=DAILY;COUNT=7;INTERVAL=1"],
    },
  },
  // Flight to SF
  {
    title: "✈️ Flight to SF",
    description: "One-time flight to San Francisco",
    isSomeday: false,
    isAllDay: false,
    count: 1,
    start: (now) => getDateTime(now, { hours: 15, minutes: 0 }),
    end: (now) => getDateTime(now, { hours: 19, minutes: 0 }),
  },
  // Dinner event
  {
    title: "🍽️ Diner with the bo",
    description: "Sunday dinner with the bo at 7:30pm",
    isSomeday: false,
    isAllDay: false,
    count: 1,
    start: (now) => getDateTime(now, { hours: 19, minutes: 30 }),
    end: (now) => getDateTime(now, { hours: 21, minutes: 0 }),
  },
  // 30min event on Monday at 2pm
  {
    title: "1:1 with Josh",
    description: "30min 1:1 meeting with Josh on Monday at 2pm",
    isSomeday: false,
    isAllDay: false,
    count: 1,
    start: (now) => getDateTime(now, { days: 1, hours: 14, minutes: 0 }),
    end: (now) => getDateTime(now, { days: 1, hours: 14, minutes: 30 }),
  },
  {
    title: "🧘 Stretch",
    description:
      "Recurring stretch session from 2:30pm to 3:15pm on Tue, Wed, and Sat",
    isSomeday: false,
    isAllDay: false,
    count: 1,
    start: (now) => getDateTime(now, { hours: 14, minutes: 30 }),
    end: (now) => getDateTime(now, { hours: 15, minutes: 15 }),
    recurrence: {
      rule: ["RRULE:FREQ=DAILY;COUNT=7;INTERVAL=1"],
    },
  },
  {
    title: "🍽️ Lunch with Gabriel",
    description: "Lunch with Gabriel on Monday from 2:45pm to 3:45pm",
    isSomeday: false,
    isAllDay: false,
    count: 1,
    start: (now) => getDateTime(now, { days: 1, hours: 14, minutes: 45 }),
    end: (now) => getDateTime(now, { days: 1, hours: 15, minutes: 45 }),
  },
  {
    title: "📝 Create slide deck",
    description:
      "Create slide deck from 4pm to 6pm on Monday, Tuesday, and Wednesday",
    isSomeday: false,
    isAllDay: false,
    count: 1,
    start: (now) => getDateTime(now, { hours: 16, minutes: 0 }),
    end: (now) => getDateTime(now, { hours: 18, minutes: 0 }),
    recurrence: {
      rule: ["RRULE:FREQ=DAILY;COUNT=7;INTERVAL=1"],
    },
  },
  {
    title: "🎬 Watch play",
    description: "Watch play from 6:45pm to 8:30pm on Tuesday",
    isSomeday: false,
    isAllDay: false,
    count: 1,
    start: (now) => getDateTime(now, { days: 2, hours: 18, minutes: 45 }),
    end: (now) => getDateTime(now, { days: 2, hours: 20, minutes: 30 }),
  },
  {
    title: "🚗 Uber to airport",
    description: "Uber to airport on Thursday from 2:15pm to 3:00pm",
    isSomeday: false,
    isAllDay: false,
    count: 1,
    start: (now) => getDateTime(now, { days: 4, hours: 14, minutes: 15 }),
    end: (now) => getDateTime(now, { days: 4, hours: 15, minutes: 0 }),
  },
  {
    title: "✈️ Flight to NYC",
    description: "Flight to NYC from 4:00pm to 7:45pm on Thursday",
    isSomeday: false,
    isAllDay: false,
    count: 1,
    start: (now) => getDateTime(now, { days: 4, hours: 16, minutes: 0 }),
    end: (now) => getDateTime(now, { days: 4, hours: 19, minutes: 45 }),
  },
  {
    title: "Dry run",
    description: "Dry run from 4:00pm to 7:45pm on Friday",
    isSomeday: false,
    isAllDay: false,
    count: 1,
    start: (now) => getDateTime(now, { days: 5, hours: 14, minutes: 45 }),
    end: (now) => getDateTime(now, { days: 5, hours: 15, minutes: 45 }),
  },
  {
    title: "My presentation",
    description: "My presentation from 4:00pm to 7:45pm on Friday",
    isSomeday: false,
    isAllDay: false,
    count: 1,
    start: (now) => getDateTime(now, { days: 5, hours: 16, minutes: 0 }),
    end: (now) => getDateTime(now, { days: 5, hours: 17, minutes: 15 }),
  },
  {
    title: "Diner with Trisha",
    description: "Dinner with Trisha from 6:30pm to 7:30pm on Friday",
    isSomeday: false,
    isAllDay: false,
    count: 1,
    start: (now) => getDateTime(now, { days: 5, hours: 18, minutes: 30 }),
    end: (now) => getDateTime(now, { days: 5, hours: 19, minutes: 30 }),
  },
  {
    title: "Shallow Work",
    description: "Shallow work from 7:30pm to 8:30pm on Saturday",
    isSomeday: false,
    isAllDay: false,
    count: 1,
    start: (now) => getDateTime(now, { days: 6, hours: 15, minutes: 45 }),
    end: (now) => getDateTime(now, { days: 6, hours: 17, minutes: 0 }),
  },
  {
    title: "Quick chat",
    description: "15 minute chat on Wednesday",
    isSomeday: false,
    isAllDay: false,
    count: 1,
    start: (now) => getDateTime(now, { days: 3, hours: 18, minutes: 30 }),
    end: (now) => getDateTime(now, { days: 3, hours: 18, minutes: 45 }),
  },
];

export default templates;
