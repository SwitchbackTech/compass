import { Categories_Event } from "@core/types/event.types";
import { getMigrationDates } from "@web/common/utils/web.date.util";

describe("Migrate: Week Event", () => {
  it("migrates week event: forward", () => {
    const dates = getMigrationDates(
      {
        startDate: "2023-06-18",
        endDate: "2023-06-24",
      },
      Categories_Event.SOMEDAY_WEEK,
      "forward"
    );

    expect(dates).toEqual({
      startDate: "2023-06-25",
      endDate: "2023-07-01",
    });
  });

  it("migrates week event: back (month change)", () => {
    const dates = getMigrationDates(
      {
        startDate: "2023-06-25",
        endDate: "2023-07-01",
      },
      Categories_Event.SOMEDAY_WEEK,
      "back"
    );

    expect(dates).toEqual({
      startDate: "2023-06-18",
      endDate: "2023-06-24",
    });
  });
});

describe("Migrate: Month Event: Forward", () => {
  const firstWeekOfJuly = {
    startDate: "2023-07-02",
    endDate: "2023-07-08",
  };
  it("migrates forward to first sunday of new month: 1", () => {
    const dates = getMigrationDates(
      {
        startDate: "2023-06-18",
        endDate: "2023-06-24",
      },
      Categories_Event.SOMEDAY_MONTH,
      "forward"
    );

    expect(dates).toEqual(firstWeekOfJuly);
  });

  it("mirgates forward to first sunday of new month: 2", () => {
    const midMonthDates = getMigrationDates(
      {
        startDate: "2023-06-04",
        endDate: "2023-06-10",
      },
      Categories_Event.SOMEDAY_MONTH,
      "forward"
    );
    expect(midMonthDates).toEqual(firstWeekOfJuly);
  });

  it("migrates forward to first sunday of new month: 3", () => {
    const monthChangeDates = getMigrationDates(
      {
        startDate: "2023-05-28",
        endDate: "2023-06-03",
      },
      Categories_Event.SOMEDAY_MONTH,
      "forward"
    );

    expect(monthChangeDates).toEqual({
      startDate: "2023-06-04",
      endDate: "2023-06-10",
    });
  });
});

describe("Migrate: Month Event: Back", () => {
  it("migrates back to last sunday of prev month: 1", () => {
    const dates = getMigrationDates(
      {
        startDate: "2023-06-04",
        endDate: "2023-06-10",
      },
      Categories_Event.SOMEDAY_MONTH,
      "back"
    );

    expect(dates).toEqual({
      startDate: "2023-05-28",
      endDate: "2023-06-03",
    });
  });

  it("migrates back to last sunday of prev month: 2", () => {
    const dates = getMigrationDates(
      {
        startDate: "2023-07-02",
        endDate: "2023-07-08",
      },
      Categories_Event.SOMEDAY_MONTH,
      "back"
    );

    expect(dates).toEqual({
      startDate: "2023-06-25",
      endDate: "2023-07-01",
    });
  });
});
