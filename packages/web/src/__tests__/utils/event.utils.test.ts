import dayjs from "dayjs";
import {
  getAllDayEventWidth,
  getEventCategory,
  getLeftPosition,
} from "@web/common/utils/grid.util";
import { widthMinusPadding } from "@web/common/utils/grid.util";
import { adjustIsTimesShown } from "@web/common/utils/event.util";

describe("adjustIsTimesShown", () => {
  it("hides times for evt in past week", () => {
    const event = adjustIsTimesShown({}, true, false);
    expect(event.isTimesShown).toBe(false);
  });
  it("hides times for event on previous day of current week", () => {
    const event = adjustIsTimesShown({}, true, true);
    expect(event.isTimesShown).toBe(false);
  });
  it("keeps isTimesShown false if it was originally", () => {
    const futureEvt = adjustIsTimesShown({ isTimesShown: false }, true, true);
    expect(futureEvt.isTimesShown).toBe(false);

    const pastEvt = adjustIsTimesShown({ isTimesShown: false }, false, false);
    expect(pastEvt.isTimesShown).toBe(false);
  });
  it("shows times for event in future week", () => {
    const event = adjustIsTimesShown({}, false, false);
    expect(event.isTimesShown).toBe(true);
  });
  it("shows times when future day of current week", () => {
    const event = adjustIsTimesShown({}, false, true);
    expect(event.isTimesShown).toBe(true);
  });
});

describe("getAllDayEventWidth", () => {
  it("is never wider than 1 week", () => {
    const widths = [88, 89, 205, 178, 133, 132, 133];
    const _maxWidth = widths.reduce((a, b) => a + b, 0);
    const maxWidth = widthMinusPadding(_maxWidth);
    const start = dayjs("2022-02-20");
    const end = dayjs("2099-12-12");
    const startOfWeek = dayjs("2040-01-01");
    const endOfWeek = dayjs("2040-01-06");

    const category = getEventCategory(start, end, startOfWeek, endOfWeek);
    expect(
      getAllDayEventWidth(category, 0, start, end, startOfWeek, widths)
    ).toBeLessThanOrEqual(maxWidth);
  });

  it("handles events with same start & end date", () => {
    const start = dayjs("2022-03-15");
    const end = dayjs("2022-03-15"); // same day as start
    const startOfWeek = dayjs("2022-03-13");
    const endOfWeek = dayjs("2022-03-19");
    const category = getEventCategory(start, end, startOfWeek, endOfWeek);
    expect(
      getAllDayEventWidth(
        category,
        2,
        start,
        end,
        startOfWeek,
        [118, 117, 273, 237, 177, 176, 177]
      )
    ).toBe(widthMinusPadding(273));
  });

  test("thisWeekOnly: 1 day", () => {
    const start = dayjs("2040-10-28");
    const end = dayjs("2040-10-29");
    const startOfWeek = dayjs("2040-10-28");
    const category = getEventCategory(
      start,
      end,
      startOfWeek,
      dayjs("2040-11-03")
    );
    const sameDayEventWidth = getAllDayEventWidth(
      category,
      0,
      start,
      end,
      startOfWeek,
      [1, 0, 0, 0, 0, 0, 0]
    );
    expect(sameDayEventWidth).toBe(1);
  });

  test("thisToFutureWeek", () => {
    const start = dayjs("2040-10-17");
    const end = dayjs("2040-10-20");
    const startOfWeek = dayjs("2040-10-11");
    const endOfWeek = dayjs("2040-11-17");

    const category = getEventCategory(start, end, startOfWeek, endOfWeek);

    expect(
      getAllDayEventWidth(
        category,
        6,
        start,
        end,
        startOfWeek,
        [1, 1, 1, 1, 1, 1, 1]
      )
    ).toBe(1);
  });

  test("pastToThisWeek", () => {
    const start = dayjs("2022-03-10");
    const end = dayjs("2022-03-16");
    const startOfWeek = dayjs("2022-03-13");
    const endOfWeek = dayjs("2022-03-19");
    const category = getEventCategory(start, end, startOfWeek, endOfWeek);
    expect(
      getAllDayEventWidth(
        category,
        -89, //this index shouldnt matter in this scenario
        start,
        end,
        startOfWeek,
        [1, 1, 1, 0, 0, 0, 0]
      )
    ).toBe(3); // 13, 14, 15

    const start2 = dayjs("2022-02-17");
    const end2 = dayjs("2022-02-24");
    const startOfWeek2 = dayjs("2022-02-20");
    const endOfWeek2 = dayjs("2022-02-27");
    const category2 = getEventCategory(start2, end2, startOfWeek2, endOfWeek2);
    expect(
      getAllDayEventWidth(
        category2,
        4,
        start2,
        end2,
        startOfWeek2,
        [1, 1, 1, 1, 0, 0, 0]
      )
      //20, 21, 23, 23
    ).toBe(4);
  });

  test("pastToThisWeek: month change", () => {
    const start = dayjs("2022-02-28");
    const end = dayjs("2022-03-08");
    const startOfWeek = dayjs("2022-03-06");
    const endOfWeek = dayjs("2022-03-12");
    const category = getEventCategory(start, end, startOfWeek, endOfWeek);

    expect(
      getAllDayEventWidth(
        category,
        1000, //this index shouldnt matter in this scenario
        start,
        end,
        startOfWeek,
        [1, 1, 0, 0, 0, 0, 0]
      )
    ).toBe(2);
  });

  test("pastToFutureWeek", () => {
    const start = dayjs("2022-01-01");
    const end = dayjs("2022-03-06");
    const startOfWeek = dayjs("2022-03-12");
    const endOfWeek = dayjs("2022-12-30");

    const category = getEventCategory(start, end, startOfWeek, endOfWeek);
    expect(
      getAllDayEventWidth(
        category,
        0,
        start,
        end,
        startOfWeek,
        [1, 1, 1, 1, 1, 1, 1]
      )
    ).toBe(7);
  });
});

describe("getLeftPosition", () => {
  it("is not more than sum of 6 day widths", () => {
    const category = getEventCategory(
      dayjs("2022-02-26"),
      dayjs("2022-02-26"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26")
    );
    const lastDayOfWeek = getLeftPosition(category, 6, [1, 1, 1, 1, 1, 1, 900]);
    expect(lastDayOfWeek).toBe(6);
  });
  test("pastToThisWeek", () => {
    const category = getEventCategory(
      dayjs("2022-02-02"),
      dayjs("2022-02-23"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26")
    );

    expect(getLeftPosition(category, 9, [1, 1, 1, 1, 1, 1, 1])).toBe(0);
  });
  test("pastToFutureWeek", () => {
    const category = getEventCategory(
      dayjs("2019-11-11"),
      dayjs("2030-11-11"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26")
    );
    expect(getLeftPosition(category, 6, [1, 1, 1, 1, 1, 1, 1])).toBe(0);
  });
  test("thisWeekOnly", () => {
    const category1 = getEventCategory(
      dayjs("2022-02-20"),
      dayjs("2022-02-23"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26")
    );
    const beginningOfWeek = getLeftPosition(
      category1,
      0,
      [0, 0, 0, 0, 0, 0, 0]
    );
    expect(beginningOfWeek).toBe(0);

    const category2 = getEventCategory(
      dayjs("2022-02-24"),
      dayjs("2022-02-26"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26")
    );
    const midWeek = getLeftPosition(category2, 4, [1, 1, 1, 1, 0, 0, 0]);
    expect(midWeek).toBe(4);

    const category3 = getEventCategory(
      dayjs("2022-02-26"),
      dayjs("2022-02-26"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26")
    );
    const endOfWeek = getLeftPosition(category3, 6, [1, 1, 1, 1, 1, 1, 900]);
    expect(endOfWeek).toBe(6);
  });

  test("thisToFutureWeek", () => {
    const category1 = getEventCategory(
      dayjs("2022-02-21"),
      dayjs("3000-03-03"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26")
    );
    const beginningOfWeek = getLeftPosition(
      category1,
      1,
      [1, 0, 0, 0, 0, 0, 0]
    );
    expect(beginningOfWeek).toBe(1);

    const category2 = getEventCategory(
      dayjs("2022-02-23"),
      dayjs("3000-03-03"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26")
    );
    const midWeek = getLeftPosition(category2, 4, [1, 1, 1, 1, 0, 0, 0]);
    expect(midWeek).toBe(4);

    const category3 = getEventCategory(
      dayjs("2022-02-25"),
      dayjs("3000-03-03"),
      dayjs("2022-02-20"),
      dayjs("2022-02-26")
    );
    const endOfWeek = getLeftPosition(category3, 6, [1, 1, 1, 1, 1, 1, 0]);
    expect(endOfWeek).toBe(6);
  });
});
