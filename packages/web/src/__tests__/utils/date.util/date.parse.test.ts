import dayjs from "dayjs";
import { Categories_Event } from "@core/types/event.types";
import { getDatesByCategory } from "@web/common/utils/web.date.util";

describe("Date Categories: Month", () => {
  it("returns future week if same month", () => {
    const dates = getDatesByCategory(
      Categories_Event.SOMEDAY_MONTH,
      dayjs("2023-06-04"),
      dayjs("2023-06-10")
    );

    expect(dates).toEqual({
      startDate: "2023-06-11",
      endDate: "2023-06-17",
    });
  });

  it("returns past week if next week goes into next month", () => {
    const dates = getDatesByCategory(
      Categories_Event.SOMEDAY_MONTH,
      dayjs("2023-06-25"),
      dayjs("2023-07-01")
    );

    expect(dates).toEqual({
      startDate: "2023-06-18",
      endDate: "2023-06-24",
    });
  });
});
