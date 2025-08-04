import { ObjectId, WithId } from "mongodb";
import { Priorities } from "../../../constants/core.constants";
import { Schema_Event } from "../../../types/event.types";

const allDayEventsThatShouldMatch: Array<WithId<Omit<Schema_Event, "_id">>> =
  // ordered by start date
  [
    {
      _id: new ObjectId(),
      user: "user1",
      title: "Feb 22",
      isAllDay: false,
      isSomeday: false,
      startDate: "2022-02",
    },
    {
      _id: new ObjectId(),
      user: "user1",
      title: "Feb 14 - Mar 8",
      isAllDay: true,
      isSomeday: false,
      startDate: "2022-02-14",
      endDate: "2022-03-08",
    },
    {
      _id: new ObjectId(),
      user: "user1",
      title: "Mar 8",
      isAllDay: true,
      isSomeday: false,
      startDate: "2022-03-08",
      endDate: "2022-03-09",
    },
    {
      _id: new ObjectId(),
      user: "user1",
      title: "Mar 10 - 12",
      isAllDay: true,
      isSomeday: false,
      startDate: "2022-03-10",
      endDate: "2022-03-13",
      priority: Priorities.WORK,
    },
  ];

const allDayEventsThatShouldNotMatch: Array<WithId<Omit<Schema_Event, "_id">>> =
  [
    {
      _id: new ObjectId(),
      user: "user1",
      title: "Feb 28 - Mar 5",
      isAllDay: true,
      isSomeday: false,
      startDate: "2022-02-28",
      endDate: "2022-03-05",
      priority: Priorities.WORK,
    },
    {
      _id: new ObjectId(),
      user: "user1",
      title: "Mar 5",
      isAllDay: true,
      isSomeday: false,
      startDate: "2022-03-05",
      endDate: "2022-03-06",
      priority: Priorities.WORK,
    },
    {
      _id: new ObjectId(),
      user: "user1",
      title: "Mar 13",
      isAllDay: true,
      isSomeday: false,
      startDate: "2022-03-13",
      endDate: "2022-03-14",
      priority: Priorities.WORK,
    },
    {
      _id: new ObjectId(),
      user: "user1",
      title: "Mar 13 - 16",
      isAllDay: true,
      isSomeday: false,
      startDate: "2022-03-13",
      endDate: "2022-03-17",
      priority: Priorities.WORK,
    },
  ];

export const mockEventSetMar22: Array<Omit<Schema_Event, "_id">> = [
  ...allDayEventsThatShouldMatch,
  ...allDayEventsThatShouldNotMatch,
];
