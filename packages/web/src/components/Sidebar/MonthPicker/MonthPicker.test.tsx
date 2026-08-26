import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "@core/util/date/dayjs";
import { MonthPicker } from "@web/components/Sidebar/MonthPicker/MonthPicker";
import { MONTH_PICKER_IN_VIEW_CLASS } from "./monthPickerDayClassName";
import { describe, expect, it, mock } from "bun:test";

const getSelectedDay = () =>
  document.querySelector(".react-datepicker__day--selected");

const dayNamed = (label: string) => screen.getByLabelText(label);

describe("MonthPicker", () => {
  it("keeps the clicked date selected while navigation catches up", async () => {
    const user = userEvent.setup({ skipHover: true });
    const onSelectDate = mock();

    render(
      <MonthPicker
        onSelectDate={onSelectDate}
        selectedDate={dayjs("2026-05-18")}
        viewEnd={dayjs("2026-05-23")}
        viewStart={dayjs("2026-05-17")}
      />,
    );

    await user.click(screen.getByLabelText("Choose Monday, May 25th, 2026"));

    expect(onSelectDate).toHaveBeenCalledTimes(1);
    expect(getSelectedDay()?.getAttribute("aria-label")).toBe(
      "Choose Monday, May 25th, 2026",
    );
  });

  it("highlights the visible Sun-Sat window, not adjacent days", () => {
    render(
      <MonthPicker
        onSelectDate={mock()}
        selectedDate={dayjs("2026-05-13")}
        viewEnd={dayjs("2026-05-16")}
        viewStart={dayjs("2026-05-10")}
      />,
    );

    expect(dayNamed("Choose Sunday, May 10th, 2026")).toHaveClass(
      MONTH_PICKER_IN_VIEW_CLASS,
    );
    expect(dayNamed("Choose Saturday, May 16th, 2026")).toHaveClass(
      MONTH_PICKER_IN_VIEW_CLASS,
    );
    expect(dayNamed("Choose Saturday, May 9th, 2026")).not.toHaveClass(
      MONTH_PICKER_IN_VIEW_CLASS,
    );
    expect(dayNamed("Choose Sunday, May 17th, 2026")).not.toHaveClass(
      MONTH_PICKER_IN_VIEW_CLASS,
    );
  });

  it("moves the in-view band when the visible window shifts while selection stays", () => {
    const { rerender } = render(
      <MonthPicker
        onSelectDate={mock()}
        selectedDate={dayjs("2026-05-13")}
        viewEnd={dayjs("2026-05-16")}
        viewStart={dayjs("2026-05-10")}
      />,
    );

    expect(dayNamed("Choose Wednesday, May 13th, 2026")).toHaveClass(
      "react-datepicker__day--selected",
    );

    rerender(
      <MonthPicker
        onSelectDate={mock()}
        selectedDate={dayjs("2026-05-13")}
        viewEnd={dayjs("2026-05-17")}
        viewStart={dayjs("2026-05-11")}
      />,
    );

    expect(dayNamed("Choose Saturday, May 9th, 2026")).not.toHaveClass(
      MONTH_PICKER_IN_VIEW_CLASS,
    );
    expect(dayNamed("Choose Sunday, May 10th, 2026")).not.toHaveClass(
      MONTH_PICKER_IN_VIEW_CLASS,
    );
    expect(dayNamed("Choose Monday, May 11th, 2026")).toHaveClass(
      MONTH_PICKER_IN_VIEW_CLASS,
    );
    expect(dayNamed("Choose Sunday, May 17th, 2026")).toHaveClass(
      MONTH_PICKER_IN_VIEW_CLASS,
    );
    expect(dayNamed("Choose Wednesday, May 13th, 2026")).toHaveClass(
      "react-datepicker__day--selected",
    );
  });
});
