import { act } from "react";
import { createMemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { getWeekDayLabel } from "@web/common/utils/event/event.util";
import { CalendarView } from "@web/views/Calendar";

const router = createMemoryRouter([{ index: true, Component: CalendarView }], {
  initialEntries: ["/"],
});

describe("Scroll", () => {
  // separate from other tests to preserve
  // '.toHaveBeenCalledTimes' reliability
  it("only scrolls once", async () => {
    const scrollSpy = jest.spyOn(window.HTMLElement.prototype, "scroll");

    await act(() => render(<></>, { router }));

    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });
});

describe("Calendar: Display without State", () => {
  it("displays all the things that a user needs to see", async () => {
    await act(() => render(<></>, { router }));

    /* week nav arrows */
    expect(
      screen.getByRole("navigation", {
        name: /previous week/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", {
        name: /next week/i,
      }),
    ).toBeInTheDocument();

    /* current week label */
    const todayLabel = getWeekDayLabel(new Date());
    expect(screen.getByTitle(todayLabel)).toBeInTheDocument();

    /* now line */
    expect(
      screen.getByRole("separator", { name: /now line/i }),
    ).toBeInTheDocument();
  });
});
