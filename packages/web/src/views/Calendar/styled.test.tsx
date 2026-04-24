import { render } from "@testing-library/react";
import { SIDEBAR_OPEN_WIDTH } from "@web/views/Calendar/layout.constants";
import { StyledCalendar } from "./styled";
import { describe, expect, it } from "bun:test";

describe("StyledCalendar", () => {
  it("caps its width when the week sidebar is open", () => {
    const { container } = render(
      <StyledCalendar isSidebarOpen={true}>Calendar</StyledCalendar>,
    );

    const calendar = container.firstElementChild as HTMLElement;

    expect(calendar.style.maxWidth).toBe(
      `calc(100vw - ${SIDEBAR_OPEN_WIDTH}px)`,
    );
  });
});
