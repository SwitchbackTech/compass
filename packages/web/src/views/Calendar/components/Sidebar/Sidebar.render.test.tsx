import React from "react";
import "@testing-library/jest-dom";
import {
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { preloadedState } from "@web/__tests__/__mocks__/state/state.weekEvents";
import { CalendarView } from "@web/views/Calendar";

beforeAll(() => {
  window.HTMLElement.prototype.scroll = jest.fn();
});

describe("Sidebar: Display without State", () => {
  it("renders sidebar with sections and icons when no events exist", async () => {
    await waitFor(() => render(<CalendarView />));

    expect(
      screen.getByRole("heading", { name: /this week/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /this month/i }),
    ).toBeInTheDocument();

    const addButtons = screen.getAllByRole("button", { name: "+" });
    expect(addButtons.length).toBeGreaterThanOrEqual(2);

    expect(
      screen.getByRole("separator", { name: /sidebar divider/i }),
    ).toBeInTheDocument();

    expect(screen.getByRole("complementary")).toBeInTheDocument();
  });
});

describe("Sidebar: Display with State", () => {
  it("displays pre-existing someday event", async () => {
    await waitFor(() => {
      render(<CalendarView />, { state: preloadedState });
    });
    screen.debug();
    await waitFor(() => {
      expect(
        within(screen.getByRole("complementary")).getByRole("button", {
          name: /^europe trip /i,
        }),
      ).toBeInTheDocument();
    });
  });
});
