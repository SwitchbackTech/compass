import React from "react";
import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import { render } from "@web/common/__mocks__/mock.render";
import { CalendarView } from "@web/views/Calendar";
import { preloadedState } from "@web/common/__mocks__/state/state.weekEvents";

describe("Sidebar: Display without State", () => {
  it("displays everything user expects when no events", async () => {
    await waitFor(() => {
      render(<CalendarView />);
    });

    // Someday title
    expect(
      screen.getByRole("heading", { name: /someday/i })
    ).toBeInTheDocument();

    // Add button
    expect(screen.getByText(/\+/i)).toBeInTheDocument();

    // Divider
    expect(
      screen.getByRole("separator", { name: /sidebar divider/i })
    ).toBeInTheDocument();

    // Month Widget
    expect(
      screen.getByRole("dialog", { name: /month widget/i })
    ).toBeInTheDocument();
  });

  // skip this until it's easier to test if sidebar is actually
  // open or collapsed. Currently that's done by altering CSS's
  // width. But the elements are still on the DOM, so you can't
  // simply assert that they're present on the DOM
  it.todo("collapses sidebar after clicking toggle button");
});

describe("Sidebar: Display with State", () => {
  it("displays pre-existing someday event", async () => {
    await waitFor(() => {
      render(<CalendarView />, { state: preloadedState });
    });

    const sidebar = screen.getByRole("complementary");
    expect(
      within(sidebar).getByRole("button", { name: /^europe trip$/i })
    ).toBeInTheDocument();
  });
});
