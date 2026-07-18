import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "@core/util/date/dayjs";
import { MonthPicker } from "@web/components/Sidebar/MonthPicker/MonthPicker";
import { describe, expect, it, mock } from "bun:test";

const getSelectedDay = () =>
  document.querySelector(".react-datepicker__day--selected");

describe("MonthPicker", () => {
  it("keeps the clicked date selected while navigation catches up", async () => {
    const user = userEvent.setup({ skipHover: true });
    const onSelectDate = mock();

    render(
      <MonthPicker
        onSelectDate={onSelectDate}
        selectedDate={dayjs("2026-05-18")}
      />,
    );

    await user.click(screen.getByLabelText("Choose Monday, May 25th, 2026"));

    expect(onSelectDate).toHaveBeenCalledTimes(1);
    expect(getSelectedDay()?.getAttribute("aria-label")).toBe(
      "Choose Monday, May 25th, 2026",
    );
  });
});
