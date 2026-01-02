import { ObjectId } from "bson";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";

/**
 * Assortment of events with no direct relation to another
 */

const USER = new ObjectId().toString();

export const CHILL_ALL_DAY: Schema_Event = {
  _id: new ObjectId().toString(),
  gEventId: "6csjad336cs3ibb469imcb9kc9gj6bb26ss30bb56kojgoj464o66ohh60",
  user: USER,
  origin: Origin.GOOGLE_IMPORT,
  title: "chill all day",
  description: "just chillin",
  priority: Priorities.RELATIONS,
  isAllDay: true,
  startDate: "2022-09-23",
  endDate: "2022-09-24",
};
export const CLIMB: Schema_Event = {
  _id: new ObjectId().toString(),
  gEventId: "ccq34eb261j3ab9jckpj6b9kcos6cbb26pi38b9pc5i64e9mcgp3ao9p6o",
  user: USER,
  origin: Origin.GOOGLE_IMPORT,
  title: "Climb",
  description: "",
  priority: Priorities.WORK,
  isAllDay: false,
  startDate: "2022-03-01T17:00:00-06:00",
  endDate: "2022-03-01T19:00:00-06:00",
};

export const EUROPE_TRIP: Schema_Event = {
  _id: new ObjectId().toString(),
  user: USER,
  origin: Origin.COMPASS,
  title: "Europe Trip",
  description: "Italy, Germany",
  isSomeday: true,
  priority: Priorities.SELF,
  startDate: "2025-12-10T00:00:00-00:00",
  endDate: "2025-12-10T00:00:00-00:00",
  order: 2,
};
export const LEARN_CHINESE: Schema_Event = {
  _id: new ObjectId().toString(),
  description: "",
  isSomeday: true,
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  title: "Learn Chinese",
  user: USER,
  startDate: "2025-06-09",
  endDate: "2025-06-09",
  order: 1,
};
export const MARCH_1: Schema_Event = {
  _id: new ObjectId().toString(),
  gEventId: "2ip0l4k0kqhg22cagtmrlml5mn",
  user: USER,
  origin: Origin.GOOGLE_IMPORT,
  title: "Mar 1",
  description: "",
  priority: Priorities.WORK,
  isAllDay: true,
  startDate: "2022-03-01",
  endDate: "2022-03-02",
};
export const GROCERIES: Schema_Event = {
  _id: new ObjectId().toString(),
  gEventId: "pihjll1k75s1g9019ru6tkb97c",
  user: USER,
  origin: Origin.GOOGLE_IMPORT,
  title: "groceries",
  description: "foo",
  priority: Priorities.RELATIONS,
  isAllDay: false,
  startDate: "2022-02-21T11:45:00-06:00",
  endDate: "2022-02-21T12:45:00-06:00",
};
export const MULTI_WEEK: Schema_Event = {
  _id: new ObjectId().toString(),
  gEventId: "1k2rgneltn79cbchccut08alqs",
  user: USER,
  origin: Origin.GOOGLE_IMPORT,
  title: "multiweek event",
  description: "",
  priority: Priorities.WORK,
  isAllDay: true,
  isSomeday: false,
  startDate: "2022-09-01T00:00:00-06:00",
  endDate: "2022-09-22T00:00:00-06:00",
};
export const TY_TIM: Schema_Event = {
  _id: new ObjectId().toString(),
  gEventId: "726v6dgnasekgmv5hc1jifpumm",
  user: USER,
  origin: Origin.GOOGLE_IMPORT,
  title: "Ty & Tim",
  description:
    "──────────\n\nTim S is inviting you to a scheduled Zoom meeting.\n\nJoin Zoom Meeting\nhttps://us02web.zoom.us/j/87324397243?pwd=ZmpuYitCelZYVll0aDdiVUNXejdzdz09\n\nMeeting ID: 873 2439 7243\nPasscode: 305275\nOne tap mobile\n+16465588656,,87324397243#,,,,*305275# US (New York)\n+13017158592,,87324397243#,,,,*305275# US (Washington DC)\n\nDial by your location\n        +1 646 558 8656 US (New York)\n        +1 301 715 8592 US (Washington DC)\n        +1 312 626 6799 US (Chicago)\n        +1 669 900 9128 US (San Jose)\n        +1 253 215 8782 US (Tacoma)\n        +1 346 248 7799 US (Houston)\nMeeting ID: 873 2439 7243\nPasscode: 305275\nFind your local number: https://us02web.zoom.us/u/kdbALZcOSa\n\n\n──────────",
  isAllDay: false,
  isSomeday: false,
  startDate: "2022-03-01T12:15:00-06:00",
  endDate: "2022-03-01T12:45:00-06:00",
  priority: Priorities.WORK,
};
