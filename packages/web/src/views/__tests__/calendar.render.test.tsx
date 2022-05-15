import React from "react";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import { CalendarView } from "@web/views/Calendar";
import { render } from "@web/common/__mocks__/mock.render";
import {
  mockLocalStorage,
  clearLocalStorageMock,
} from "@web/common/utils/test.util";
import { weekEventState } from "@web/common/__mocks__/state/state.weekEvents";
import { CompassRoot } from "@web/routers/index";
import { getWeekDayLabel } from "@web/ducks/events/event.utils";

import { useGetWeekViewProps } from "../Calendar/weekViewHooks/useGetWeekViewProps";

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
    localStorage.setItem("token", "secretTokenValue");
    window.HTMLElement.prototype.scroll = jest.fn();

    await waitFor(() => {
      render(<CalendarView />);
    });
    // expect(window.HTMLElement.prototype.scroll).toHaveBeenCalled();
    // $$ set back to 1 once duplicate rerenders gets fixed
    expect(window.HTMLElement.prototype.scroll).toHaveBeenCalledTimes(1);
    clearLocalStorageMock();
  });
});

describe("Stateless Rendering", () => {
  beforeEach(() => {
    mockLocalStorage();
    localStorage.setItem("token", "secretTokenValue");
  });
  afterEach(() => {
    clearLocalStorageMock();
  });

  it("renders current year in YYYY format", async () => {
    await waitFor(() => {
      render(<CalendarView />);
    });

    const currentYear = new Date().getFullYear().toString(); // YYYY
    expect(screen.getByText(currentYear)).toBeInTheDocument();
  });

  it("renders week navigation arrows", async () => {
    await waitFor(() => {
      render(<CalendarView />);
    });

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
  });

  it("renders current week", async () => {
    await waitFor(() => {
      render(<CalendarView />);
    });
    const todayLabel = getWeekDayLabel(new Date());
    expect(screen.getByTitle(todayLabel)).toBeInTheDocument();
  });

  it("renders now line", async () => {
    await waitFor(() => {
      render(<CalendarView />);
    });
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });
});

describe("Stateful Rendering", () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scroll = jest.fn();
  });
  beforeEach(() => {
    mockLocalStorage();
    localStorage.setItem("token", "secretTokenValue");
  });
  afterAll(() => {
    clearLocalStorageMock();
  });

  it("renders both timed and all day events", async () => {
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
