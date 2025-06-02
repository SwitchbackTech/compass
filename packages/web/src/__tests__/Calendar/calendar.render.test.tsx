import React from "react";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import { GROCERIES } from "@core/__mocks__/v1/events/events.misc";
import { findAndUpdateEventInPreloadedState } from "@web/__tests__/Calendar/calendar.render.test.utils";
import { freshenEventStartEndDate } from "@web/__tests__/Calendar/calendar.render.test.utils";
import { preloadedState } from "@web/__tests__/__mocks__/state/state.weekEvents";
import { getWeekDayLabel } from "@web/common/utils/event.util";
import { CalendarView } from "@web/views/Calendar";
import { render } from "../__mocks__/mock.render";

describe("Scroll", () => {
  // separate from other tests to preserve
  // '.toHaveBeenCalledTimes' reliability
  it("only scrolls once", async () => {
    await waitFor(() => {
      render(<CalendarView />);
    });

    expect(window.HTMLElement.prototype.scroll).toHaveBeenCalledTimes(1);
  });
});

describe("Calendar: Display without State", () => {
  it("displays all the things that a user needs to see", async () => {
    await waitFor(() => {
      render(<CalendarView />);
    });

    /* current year in YYYY format */
    // const currentYear = new Date().getFullYear().toString(); // YYYY
    // expect(screen.getByText(currentYear)).toBeInTheDocument();

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

describe("Calendar: Display with State", () => {
  it("displays timed events", async () => {
    const newPreloadedState = findAndUpdateEventInPreloadedState(
      preloadedState,
      GROCERIES._id as string,
      freshenEventStartEndDate,
    );

    await waitFor(() => {
      render(<CalendarView />, { state: newPreloadedState });
    });
    expect(
      screen.getByRole("button", { name: /groceries/i }),
    ).toBeInTheDocument();

    //   expect(
    //     screen.getByRole("button", { name: /chill all day/i })
    //   ).toBeInTheDocument();
  });
});
