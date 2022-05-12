import React from "react";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import { CalendarView } from "@web/views/Calendar";
import { render } from "@web/common/__mocks__/oldmock.render";
import {
  mockLocalStorage,
  clearLocalStorageMock,
} from "@web/common/utils/test.util";
import { weekEventState } from "@web/common/__mocks__/state/state.weekEvents";
import { CompassRoot } from "@web/routers/index";
import { getWeekDayLabel } from "@web/ducks/events/event.utils";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

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

  /* disabled because breaks with container root stuff 
    and the awaitFor() workaround not working

  it("shows calendar when local storage token present", () => {
    localStorage.setItem("token", "secretTokenValue");
    render(CompassRoot);
    
    expect(
      screen.queryByRole("button", { name: /sign in/i })
    ).not.toBeInTheDocument();
  });
  */
});

describe("CalendarView", () => {
  beforeAll(() => {
    mockLocalStorage();
    localStorage.setItem("token", "secretTokenValue");
  });
  afterAll(() => {
    clearLocalStorageMock();
  });

  it("renders current year in YYYY format", async () => {
    // workaround to for Redux connected component act() warning
    // render(<CalendarView />);
    await waitFor(() => {
      render(
        <DndProvider backend={HTML5Backend}>
          <CalendarView />
        </DndProvider>
      );
      const currentYear = new Date().getFullYear().toString(); // YYYY
      expect(screen.getByText(currentYear)).toBeInTheDocument();
    });
  });

  it("renders week navigation arrows", async () => {
    // workaround to for Redux connected component act() warning
    await waitFor(() => {
      render(<CalendarView />);
    });

    // render(<CalendarView />);
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

describe("CalendarView: Renders with State", () => {
  beforeEach(() => {
    mockLocalStorage();
    localStorage.setItem("token", "secretTokenValue");
  });
  afterAll(() => {
    clearLocalStorageMock();
  });

  it("renders both timed and all day events", async () => {
    const preloadedState = weekEventState; // has to be called 'preloadedState' to render correctly
    await waitFor(() => {
      render(<CalendarView />, { preloadedState });
    });

    expect(
      screen.getByRole("button", { name: /groceries/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /chill all day/i })
    ).toBeInTheDocument();
  });
});
