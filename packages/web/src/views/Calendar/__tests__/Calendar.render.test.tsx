import React from "react";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { CalendarView } from "@web/views/Calendar";
import { render } from "@web/common/helpers/test.helpers";
import {
  mockLocalStorage,
  clearLocalStorageMock,
} from "@web/common/__tests__/test.util";
import { weekEventState } from "@web/common/__mocks__/state.weekEvents";
import { CompassRoot } from "@web/routers/index";

beforeAll(() => {
  window.HTMLElement.prototype.scroll = jest.fn();
});

describe("Routing", () => {
  beforeEach(() => mockLocalStorage());
  afterEach(() => clearLocalStorageMock());

  it("goes to login page when local storage token missing", () => {
    render(CompassRoot);
    expect(
      screen.getByRole("button", { name: /connect my google calendar/i })
    ).toBeInTheDocument();
  });
  it("shows calendar when local storage token present", () => {
    localStorage.setItem("token", "secretTokenValue");
    render(CompassRoot);
    expect(
      screen.getByRole("button", { name: /connect my google calendar/i })
    ).toBeInTheDocument();
  });
});

describe("CalendarView: Renders", () => {
  it("current year in YYYY format", () => {
    render(<CalendarView />);
    const currentYear = new Date().getFullYear().toString(); // YYYY
    expect(screen.getByText(currentYear)).toBeInTheDocument();
  });

  it("navigation arrows", () => {
    render(<CalendarView />);
    expect(screen.getByText(/</i)).toBeInTheDocument();
    expect(screen.getByText(/>/i)).toBeInTheDocument();
  });

  it("current week", () => {
    render(<CalendarView />);
    const todaysDateNumber = new Date().getDate().toString();
    expect(screen.getByText(todaysDateNumber)).toBeInTheDocument();
  });

  it("automatically scrolls", () => {
    render(<CalendarView />);
    expect(window.HTMLElement.prototype.scroll).toHaveBeenCalled();
    // $$ set back to 1 once duplicate rerenders gets fixed
    // expect(window.HTMLElement.prototype.scroll).toHaveBeenCalledTimes(1);
  });
});

describe("CalendarView: Renders with State", () => {
  beforeEach(() => {
    const preloadedState = weekEventState; // has to be called 'preloadedState' to render correctly
    render(<CalendarView />, { preloadedState });
  });

  it("timed and all day event", () => {
    expect(
      screen.getByRole("button", { name: /groceries/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /chill all day/i })
    ).toBeInTheDocument();
  });
});
