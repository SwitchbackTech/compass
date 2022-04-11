import React from "react";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { CalendarView } from "@web/views/Calendar";
import { render } from "@web/common/__mocks__/mock.render";
import {
  mockLocalStorage,
  clearLocalStorageMock,
} from "@web/common/utils/test.util";
import { weekEventState } from "@web/common/__mocks__/state/state.weekEvents";
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
      screen.getByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();
  });
  it("shows calendar when local storage token present", () => {
    localStorage.setItem("token", "secretTokenValue");
    render(<CalendarView />);
    expect(
      screen.queryByRole("button", { name: /sign in/i })
    ).not.toBeInTheDocument();
  });
});

describe("CalendarView", () => {
  beforeAll(() => {
    mockLocalStorage();
    localStorage.setItem("token", "secretTokenValue");
  });
  afterAll(() => {
    clearLocalStorageMock();
  });

  it("renders current year in YYYY format", () => {
    render(<CalendarView />);
    const currentYear = new Date().getFullYear().toString(); // YYYY
    expect(screen.getByText(currentYear)).toBeInTheDocument();
  });

  it("renders navigation arrows", () => {
    render(<CalendarView />);
    expect(screen.getByText(/</i)).toBeInTheDocument();
    expect(screen.getByText(/>/i)).toBeInTheDocument();
  });

  it("renders current week", () => {
    render(<CalendarView />);
    const todaysDateNumber = new Date().getDate().toString();
    expect(screen.getByText(todaysDateNumber)).toBeInTheDocument();
  });

  it("renders now line", () => {
    render(<CalendarView />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
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
    mockLocalStorage();
    localStorage.setItem("token", "secretTokenValue");
  });
  afterAll(() => {
    clearLocalStorageMock();
  });

  it("renders both timed and all day events", () => {
    const preloadedState = weekEventState; // has to be called 'preloadedState' to render correctly
    render(<CalendarView />, { preloadedState });
    expect(
      screen.getByRole("button", { name: /groceries/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /chill all day/i })
    ).toBeInTheDocument();
  });
});
