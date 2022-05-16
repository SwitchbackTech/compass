import React from "react";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import { CalendarView } from "@web/views/Calendar";
import { render } from "@web/common/__mocks__/mock.render";
import {
  mockLocalStorage,
  clearLocalStorageMock,
  mockScroll,
} from "@web/common/utils/test.util";
import { weekEventState } from "@web/common/__mocks__/state/state.weekEvents";
import { CompassRoot } from "@web/routers/index";
import { getWeekDayLabel } from "@web/ducks/events/event.utils";

describe("Routing", () => {
  it("goes to login page when local storage token missing", () => {
    mockLocalStorage();
    render(CompassRoot);
    expect(
      screen.getByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();
    clearLocalStorageMock();
  });
});

describe("Scroll", () => {
  // separate from other tests to preserve
  // '.toHaveBeenCalledTimes' reliability
  it("only scrolls once", async () => {
    mockLocalStorage();
    mockScroll();
    localStorage.setItem("token", "secretTokenValue");

    await waitFor(() => {
      render(<CalendarView />);
    });

    expect(window.HTMLElement.prototype.scroll).toHaveBeenCalledTimes(1);
    clearLocalStorageMock();
  });
});

describe("Stateless Rendering", () => {
  beforeAll(() => mockScroll());
  beforeEach(() => {
    mockLocalStorage();
    localStorage.setItem("token", "secretTokenValue");
  });
  afterEach(() => {
    clearLocalStorageMock();
  });

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

describe("Stateful Rendering", () => {
  beforeAll(() => {
    mockScroll();
  });
  beforeEach(() => {
    mockLocalStorage();
    localStorage.setItem("token", "secretTokenValue");
  });
  afterAll(() => {
    clearLocalStorageMock();
  });

  it("dispays both timed and all day events", async () => {
    await waitFor(() => {
      render(<CalendarView />, { state: weekEventState });
    });

    expect(
      screen.getByRole("button", { name: /groceries/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /chill all day/i })
    ).toBeInTheDocument();
  });
});
