import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";

export const initialData = {
  tasks: {
    "task-1": { id: "task-1", content: "Take out the garbage" },
    "task-2": { id: "task-2", content: "Watch my favorite show" },
    "task-3": { id: "task-3", content: "Charge my phone" },
    "task-4": { id: "task-4", content: "Cook dinner" },
  },
  columns: {
    "column-1": {
      id: "column-1",
      title: "To do",
      taskIds: ["task-1", "task-2", "task-3", "task-4"],
    },
  },
  // Facilitate reordering of the columns
  columnOrder: ["column-1"],
};

export interface Schema_SomedayEventsColumn {
  columns: {
    [key: string]: {
      id: string;
      title: string;
      eventIds: string[];
    };
  };
  columnOrder: string[];
  events: {
    [key: string]: Schema_Event;
  };
}

export const hardSomedayEvents = {
  columns: {
    "column-1": {
      id: "column-1",
      title: "3.12-18",
      eventIds: [
        "64061b3e937a98a749d48a07",
        "6408ca1abd2d876ae3dc1270",
        "640a6541c24a0aea0ad63913",
        "640a6588c24a0aea0ad63917",
        "640cdf2e3d70242df7bc3b92",
      ],
    },
  },
  // Facilitate reordering of the columns
  columnOrder: ["column-1"],
  events: {
    "64061b3e937a98a749d48a07": {
      _id: "64061b3e937a98a749d48a07",
      gEventId: "98ki4jphp4858e318t678agqa0",
      user: "64061b3b937a98a749d487dd",
      origin: Origin.GOOGLE,
      title: "hi-ed",
      description: "",
      isAllDay: false,
      isOpen: false,
      isSomeday: true,
      isTimesShown: true,
      startDate: "2023-03-12",
      endDate: "2023-03-18",
      priority: Priorities.UNASSIGNED,
      updatedAt: "2023-03-12T21:46:32.148Z",
      id: "64061b3e937a98a749d48a07",
    },
    "6408ca1abd2d876ae3dc1270": {
      _id: "6408ca1abd2d876ae3dc1270",
      isAllDay: false,
      isSomeday: true,
      isOpen: false,
      origin: Origin.COMPASS,
      priority: Priorities.UNASSIGNED,
      startDate: "2023-03-12",
      endDate: "2023-03-18",
      title: "second",
      updatedAt: "2023-03-12T19:16:46.267Z",
      user: "64061b3b937a98a749d487dd",
      order: 2,
      id: "6408ca1abd2d876ae3dc1270",
    },
    "640a6541c24a0aea0ad63913": {
      _id: "640a6541c24a0aea0ad63913",
      isAllDay: false,
      isSomeday: true,
      isOpen: false,
      origin: Origin.COMPASS,
      priority: Priorities.RELATIONS,
      startDate: "2023-03-12",
      endDate: "2023-03-18",
      title: "fourth",
      updatedAt: "2023-03-12T19:16:46.682Z",
      user: "64061b3b937a98a749d487dd",
      order: 4,
      id: "640a6541c24a0aea0ad63913",
    },
    "640a6588c24a0aea0ad63917": {
      _id: "640a6588c24a0aea0ad63917",
      isAllDay: false,
      isSomeday: true,
      isOpen: false,
      origin: Origin.COMPASS,
      priority: Priorities.WORK,
      startDate: "2023-03-12",
      endDate: "2023-03-18",
      title: "fifth",
      updatedAt: "2023-03-12T19:16:47.067Z",
      user: "64061b3b937a98a749d487dd",
      order: 5,
      id: "640a6588c24a0aea0ad63917",
    },
    "640cdf2e3d70242df7bc3b92": {
      _id: "640cdf2e3d70242df7bc3b92",
      isAllDay: false,
      isSomeday: true,
      isOpen: false,
      origin: Origin.COMPASS,
      priority: Priorities.SELF,
      startDate: "2023-03-12",
      endDate: "2023-03-18",
      title: "third",
      updatedAt: "2023-03-12T19:16:47.500Z",
      user: "64061b3b937a98a749d487dd",
      order: 3,
      id: "640cdf2e3d70242df7bc3b92",
    },
  },
};
