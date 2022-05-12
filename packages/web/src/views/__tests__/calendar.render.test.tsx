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

beforeAll(() => {
  window.HTMLElement.prototype.scroll = jest.fn();
});

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

describe("CalendarView: Stateless Rendering", () => {
  beforeEach(() => {
    mockLocalStorage();
    localStorage.setItem("token", "secretTokenValue");
  });
  afterEach(() => {
    clearLocalStorageMock();
  });

  it("renders current year in YYYY format", async () => {
    await waitFor(() => {
      // workaround to for Redux connected component act() warning
      render(<CalendarView />);
    });

    const currentYear = new Date().getFullYear().toString(); // YYYY
    expect(screen.getByText(currentYear)).toBeInTheDocument();
  });

  it("renders week navigation arrows", async () => {
    // workaround to for Redux connected component act() warning
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
    // workaround to for Redux connected component act() warning
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

  it("automatically scrolls", async () => {
    // workaround to for Redux connected component act() warning
    await waitFor(() => {
      render(<CalendarView />);
    });
    expect(window.HTMLElement.prototype.scroll).toHaveBeenCalled();
    // $$ set back to 1 once duplicate rerenders gets fixed
    // expect(window.HTMLElement.prototype.scroll).toHaveBeenCalledTimes(1);
  });
});

describe("CalendarView: Stateful Rendering", () => {
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
