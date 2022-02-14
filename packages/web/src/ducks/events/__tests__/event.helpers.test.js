import { allDayEventsMinimal } from "@core/test-data/data.allDayEvents";

import { getAllDayCounts, orderEvents } from "../event.helpers";

describe("getAllDayCounts", () => {
  const allDayEvents = [
    {
      _id: "620684a62ca742378271b7c2",
      gEventId: "3eg7r4a73qjc3iaon62vne1smt",
      user: "61f2f0704d0ee49134c7a01d",
      origin: "googleimport",
      title: "1112FS",
      description: "",
      priorities: [],
      isAllDay: true,
      startDate: "2022-02-11",
      endDate: "2022-02-13",
      priority: "relations",
      allDayOrder: 2,
    },
    {
      _id: "620684a62ca742378271b7cc",
      gEventId: "oafbs12g2r88dlhv1ksn5rujkk",
      user: "61f2f0704d0ee49134c7a01d",
      origin: "google",
      title: "9ag2",
      description: null,
      priorities: [],
      isAllDay: true,
      startDate: "2022-02-09",
      endDate: "2022-02-09",
      priority: "self",
      allDayOrder: 2,
      isOpen: false,
    },
    {
      _id: "620684a62ca742378271b7ce",
      gEventId: "3erlfdodcj4ncc3teg58dkmk20",
      user: "61f2f0704d0ee49134c7a01d",
      origin: "google",
      title: "dd",
      description: null,
      priorities: [],
      isAllDay: true,
      startDate: "2022-02-07",
      endDate: "2022-02-07",
      priority: "self",
      allDayOrder: 1,
      isOpen: false,
    },
    {
      _id: "620684a62ca742378271b7cf",
      gEventId: "v6hg2mnogf9t9chjdag6tpn5ck",
      user: "61f2f0704d0ee49134c7a01d",
      origin: "googleimport",
      title: "asdf",
      description: "",
      priorities: [],
      isAllDay: true,
      startDate: "2022-02-09",
      endDate: "2022-02-09",
      priority: "relations",
      allDayOrder: 1,
    },
    {
      _id: "620684a62ca742378271b7e0",
      gEventId: "kbn783mbudavtohkuebgtav910",
      user: "61f2f0704d0ee49134c7a01d",
      origin: "googleimport",
      title: "8ac4",
      description: "",
      priorities: [],
      isAllDay: true,
      startDate: "2022-02-07",
      endDate: "2022-02-07",
      priority: "relations",
      allDayOrder: 2,
    },
    {
      _id: "620684a62ca742378271b7e2",
      gEventId: "45s0vf3kf0mvft4neel7ps6ghc",
      user: "61f2f0704d0ee49134c7a01d",
      origin: "google",
      title: "8ai",
      description: null,
      priorities: [],
      isAllDay: true,
      startDate: "2022-02-11",
      endDate: "2022-02-11",
      priority: "self",
      allDayOrder: 1,
      isOpen: false,
      isTimeSelected: true,
    },
    {
      _id: "620684a62ca742378271b7e4",
      gEventId: "1qo9n2n3r5907r18b5croon8m5",
      user: "61f2f0704d0ee49134c7a01d",
      origin: "google",
      title: "8aaa",
      description: "a cool event with a cool description",
      priorities: [],
      isAllDay: true,
      startDate: "2022-02-07",
      endDate: "2022-02-10",
      priority: "self",
      allDayOrder: 3,
      isOpen: true,
      isTimeSelected: true,
    },
    {
      _id: "62068eae722447aa668a53b6",
      priority: "self",
      isAllDay: true,
      startDate: "2022-02-08",
      endDate: "2022-02-08",
      allDayOrder: 1,
      isOpen: false,
      title: "aa",
      isTimeSelected: true,
      origin: "google",
      user: "61f2f0704d0ee49134c7a01d",
      gEventId: "2u6lvpo45kgajrsfeg6otugtcc",
      description: null,
      priorities: [],
    },
    ,
  ];

  const allDayCounts = getAllDayCounts(allDayEvents);
  it("adds dates up correctly", () => {
    expect(allDayCounts["2022-02-07"]).toBe(3);
    expect(allDayCounts["2022-02-08"]).toBe(1);
    expect(allDayCounts["2022-02-09"]).toBe(1);
    expect(allDayCounts["2022-02-11"]).toBe(1);
  });

  it("returns one key for unique date", () => {
    const numDates = Object.keys(allDayCounts).length;
    expect(numDates).toBe(4); //07, 08, 09, 11
  });
});

describe("orderAllDayEvents", () => {
  const events = orderEvents(allDayEventsMinimal);
  it("doesnt add or remove any events", () => {
    expect(events.length).toEqual(allDayEventsMinimal.length);
  });
  it("sets the order for each event", () => {
    events.forEach((e) => {
      if (e.allDayOrder === undefined) throw Error("missing order");
    });
  });
  it("orders title descending (c, b, a)", () => {
    const first = events.filter((e) => e.title === "test1")[0];
    expect(first.allDayOrder).toBe(5);

    const fifth = events.filter((e) => e.title === "test5")[0];
    expect(fifth.allDayOrder).toBe(1);
  });

  it("sets unique order for two events with same title", () => {
    const dup1 = events.filter((e) => e.title === "test3duplicate")[0];
    const dup2 = events.filter((e) => e.title === "test3duplicate")[1];
    expect(dup1.allDayOrder).not.toEqual(dup2.allDayOrder);
  });
});
