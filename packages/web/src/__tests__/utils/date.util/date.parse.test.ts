import dayjs from "dayjs";
import { Categories_Event } from "@core/types/event.types";
import { getDatesByCategory } from "@web/common/utils/web.date.util";

describe("Date Categories: Month", () => {
  it("uses first and last of month: case1", () => {
    const dates = getDatesByCategory(
      Categories_Event.SOMEDAY_MONTH,
      dayjs("2023-06-04"),
      dayjs("2023-06-10")
    );

    expect(dates).toEqual({
      startDate: "2023-06-01",
      endDate: "2023-06-30",
    });
  });

  it("returns first & last of month based on start date", () => {
    const dates = getDatesByCategory(
      Categories_Event.SOMEDAY_MONTH,
      dayjs("2023-06-25"),
      dayjs("2023-07-01")
    );

    expect(dates).toEqual({
      startDate: "2023-06-01",
      endDate: "2023-06-30",
    });
  });
});
