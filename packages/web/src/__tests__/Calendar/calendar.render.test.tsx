import React from "react";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { preloadedState } from "@web/__tests__/__mocks__/state/state.weekEvents";
import { CompassRoot } from "@web/routers/index";
import { getWeekDayLabel } from "@web/ducks/events/event.utils";
import { LocalStorage } from "@web/common/constants/web.constants";
import { CalendarView } from "@web/views/Calendar";

describe("Routing", () => {
  it("goes to login page when local storage token missing", () => {
    localStorage.removeItem(LocalStorage.TOKEN);

    render(CompassRoot);
    expect(
      screen.getByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();

    // re-add for other tests
    localStorage.setItem(LocalStorage.TOKEN, "secretTokenValue");
  });
});

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
    const currentYear = new Date().getFullYear().toString(); // YYYY
    expect(screen.getByText(currentYear)).toBeInTheDocument();

    /* week nav arrows */
    expect(
      screen.getByRole("navigation", {
        name: /previous week/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", {
        name: /next week/i,
      })
    ).toBeInTheDocument();

    /* current week label */
    const todayLabel = getWeekDayLabel(new Date());
    expect(screen.getByTitle(todayLabel)).toBeInTheDocument();

    /* now line */
    expect(
      screen.getByRole("separator", { name: /now line/i })
    ).toBeInTheDocument();
  });
});

describe("Calendar: Display with State", () => {
  it("dispays both timed and all day events", async () => {
    await waitFor(() => {
      render(<CalendarView />, { state: preloadedState });
    });
    expect(
      screen.getByRole("button", { name: /groceries/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /chill all day/i })
    ).toBeInTheDocument();
  });
});
