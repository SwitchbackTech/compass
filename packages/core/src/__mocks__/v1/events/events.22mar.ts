import { ObjectId } from "bson";
import { type CompassEvent } from "@core/types/compass-event.contracts";
import { type WithObjectId } from "@core/types/type.utils";

const allDayEventsThatShouldMatch: Array<
  WithObjectId<Omit<CompassEvent, "_id">>
> =
  // ordered by start date
  [
    {
      _id: new ObjectId(),
      user: "user1",
      title: "Feb 22",
      isAllDay: false,
      startDate: "2022-02",
    },
    {
      _id: new ObjectId(),
      user: "user1",
      title: "Feb 14 - Mar 8",
      isAllDay: true,
      startDate: "2022-02-14",
      endDate: "2022-03-08",
    },
    {
      _id: new ObjectId(),
      user: "user1",
      title: "Mar 8",
      isAllDay: true,
      startDate: "2022-03-08",
      endDate: "2022-03-09",
    },
    {
      _id: new ObjectId(),
      user: "user1",
      title: "Mar 10 - 12",
      isAllDay: true,
      startDate: "2022-03-10",
      endDate: "2022-03-13",
    },
  ];

const allDayEventsThatShouldNotMatch: Array<
  WithObjectId<Omit<CompassEvent, "_id">>
> = [
  {
    _id: new ObjectId(),
    user: "user1",
    title: "Feb 28 - Mar 5",
    isAllDay: true,
    startDate: "2022-02-28",
    endDate: "2022-03-05",
  },
  {
    _id: new ObjectId(),
    user: "user1",
    title: "Mar 5",
    isAllDay: true,
    startDate: "2022-03-05",
    endDate: "2022-03-06",
  },
  {
    _id: new ObjectId(),
    user: "user1",
    title: "Mar 13",
    isAllDay: true,
    startDate: "2022-03-13",
    endDate: "2022-03-14",
  },
  {
    _id: new ObjectId(),
    user: "user1",
    title: "Mar 13 - 16",
    isAllDay: true,
    startDate: "2022-03-13",
    endDate: "2022-03-17",
  },
];

export const mockEventSetMar22: Array<Omit<CompassEvent, "_id">> = [
  ...allDayEventsThatShouldMatch,
  ...allDayEventsThatShouldNotMatch,
];
