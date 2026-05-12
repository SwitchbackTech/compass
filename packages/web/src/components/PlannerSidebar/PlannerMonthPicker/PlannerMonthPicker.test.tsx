import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "styled-components";
import dayjs from "@core/util/date/dayjs";
import { theme } from "@web/common/styles/theme";
import { PlannerMonthPicker } from "@web/components/PlannerSidebar/PlannerMonthPicker/PlannerMonthPicker";
import { describe, expect, it, mock } from "bun:test";

const getSelectedDay = () =>
  document.querySelector(".react-datepicker__day--selected");

describe("PlannerMonthPicker", () => {
  it("keeps the clicked date selected while navigation catches up", async () => {
    const user = userEvent.setup({ skipHover: true });
    const onSelectDate = mock();

    render(
      <ThemeProvider theme={theme}>
        <PlannerMonthPicker
          onSelectDate={onSelectDate}
          selectedDate={dayjs("2026-05-18")}
        />
      </ThemeProvider>,
    );

    await user.click(screen.getByLabelText("Choose Monday, May 25th, 2026"));

    expect(onSelectDate).toHaveBeenCalledTimes(1);
    expect(getSelectedDay()?.getAttribute("aria-label")).toBe(
      "Choose Monday, May 25th, 2026",
    );
  });
});
