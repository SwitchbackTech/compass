import dayjs from "dayjs";

import { allDayEventsMinimal } from "@core/test-data/data.allDayEvents";
import { allDayEvents } from "@core/test-data/data.allDayEvents2";

import {
  getAllDayCounts,
  getAllDayEventWidth,
  getLeftPosition,
  orderEvents,
} from "../event.helpers";

describe("getAllDayCounts", () => {
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
describe("getAllDayEventWidth!", () => {
  test("thisWeekOnly: 1 day", () => {
    const widths = [1, 0, 0, 0, 0, 0, 0];
    const sameDayEventWidth = getAllDayEventWidth(
      0,
      dayjs("2040-10-28"),
      dayjs("2040-10-29"),
      dayjs("2040-10-28"),
      dayjs("2040-11-03"),
      widths
    );
    expect(sameDayEventWidth).toBe(1);
  });

  test("thisToFutureWeek", () => {
    expect(
      getAllDayEventWidth(
        6,
        dayjs("2040-10-17"),
        dayjs("2040-10-20"),
        dayjs("2040-10-11"),
        dayjs("2040-11-17"),
        [1, 1, 1, 1, 1, 1, 1]
      )
    ).toBe(1);
  });

  test("pastToThisWeek", () => {
    expect(
      getAllDayEventWidth(
        -89, //this index shouldnt matter in this scenario
        dayjs("2022-03-10"),
        dayjs("2022-03-16"),
        dayjs("2022-03-13"),
        dayjs("2022-03-19"),
        [1, 1, 1, 0, 0, 0, 0]
      )
    ).toBe(3); // 13, 14, 15

    expect(
      getAllDayEventWidth(
        4,
        dayjs("2022-02-17"),
        dayjs("2022-02-24"),
        dayjs("2022-02-20"),
        dayjs("2022-02-27"),
        [1, 1, 1, 1, 0, 0, 0]
      )
      //20, 21, 23, 23
    ).toBe(4);
  });

  test("pastToThisWeek: month change", () => {
    expect(
      getAllDayEventWidth(
        1000, //this index shouldnt matter in this scenario
        dayjs("2022-02-28"),
        dayjs("2022-03-08"),
        dayjs("2022-03-06"),
        dayjs("2022-03-12"),
        [1, 1, 0, 0, 0, 0, 0]
      )
    ).toBe(2);
  });

  test("pastToFutureWeek", () => {
    expect(
      getAllDayEventWidth(
        0,
        dayjs("2022-01-01"),
        dayjs("2022-03-06"),
        dayjs("2022-03-12"),
        dayjs("2022-12-30"),
        [1, 1, 1, 1, 1, 1, 1]
      )
    ).toBe(7);
  });

  it("is never wider than 1 week", () => {
    const widths = [88, 89, 205, 178, 133, 132, 133];
    const maxWidth = widths.reduce((a, b) => a + b, 0);
    expect(
      getAllDayEventWidth(
        0,
        dayjs("2022-02-20"),
        dayjs("2099-12-12"),
        dayjs("2040-01-01"),
        dayjs("2040-01-06"),
        widths
      )
    ).toBeLessThanOrEqual(maxWidth);
  });
});

describe("getLeftPosition", () => {
  it("is not more than sum of 6 day widths", () => {
    const lastDayOfWeek = getLeftPosition(
      6,
      dayjs("2022-02-26"),
      dayjs("2022-02-26"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26"),
      [1, 1, 1, 1, 1, 1, 900]
    );

    expect(lastDayOfWeek).toBe(6);
  });
  test("pastToThisWeek", () => {
    expect(
      getLeftPosition(
        9,
        dayjs("2022-02-02"),
        dayjs("2022-02-23"),
        dayjs("2022-02-20"),
        dayjs("2022-02-26"),
        [1, 1, 1, 1, 1, 1, 1]
      )
    ).toBe(0);
  });
  test("pastToFutureWeek", () => {
    expect(
      getLeftPosition(
        6,
        dayjs("2019-11-11"),
        dayjs("2030-11-11"),
        dayjs("2022-02-20"),
        dayjs("2022-02-26"),
        [1, 1, 1, 1, 1, 1, 1]
      )
    ).toBe(0);
  });
  test("thisWeekOnly", () => {
    const beginningOfWeek = getLeftPosition(
      0,
      dayjs("2022-02-20"),
      dayjs("2022-02-23"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26"),
      [0, 0, 0, 0, 0, 0, 0]
    );
    expect(beginningOfWeek).toBe(0);

    const midWeek = getLeftPosition(
      4,
      dayjs("2022-02-24"),
      dayjs("2022-02-26"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26"),
      [1, 1, 1, 1, 0, 0, 0]
    );
    expect(midWeek).toBe(4);

    const endOfWeek = getLeftPosition(
      6,
      dayjs("2022-02-26"),
      dayjs("2022-02-26"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26"),
      [1, 1, 1, 1, 1, 1, 900]
    );
    expect(endOfWeek).toBe(6);
  });

  test("thisToFutureWeek", () => {
    const beginningOfWeek = getLeftPosition(
      1,
      dayjs("2022-02-21"),
      dayjs("3000-03-03"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26"),
      [1, 0, 0, 0, 0, 0, 0]
    );
    expect(beginningOfWeek).toBe(1);

    const midWeek = getLeftPosition(
      4,
      dayjs("2022-02-23"),
      dayjs("3000-03-03"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26"),
      [1, 1, 1, 1, 0, 0, 0]
    );
    expect(midWeek).toBe(4);

    const endOfWeek = getLeftPosition(
      6,
      dayjs("2022-02-25"),
      dayjs("3000-03-03"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26"),
      [1, 1, 1, 1, 1, 1, 0]
    );
    expect(endOfWeek).toBe(6);
  });
});

describe("orderAllDayEvents", () => {
  const events = orderEvents(allDayEventsMinimal);
  it("doesn't add or remove any events", () => {
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
