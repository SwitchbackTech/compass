import React from "react";
import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import { render } from "@web/common/__mocks__/mock.render";
import {
  mockLocalStorage,
  clearLocalStorageMock,
  mockScroll,
} from "@web/common/utils/test.util";
import { CalendarView } from "@web/views/Calendar";
import { weekEventState } from "@web/common/__mocks__/state/state.weekEvents";

beforeAll(() => {
  mockLocalStorage();
  mockScroll();
  localStorage.setItem("token", "secretTokenValue");
});
afterAll(() => {
  clearLocalStorageMock();
});
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

  it.todo("collapses sidebar after clicking toggle button");
});

describe("Sidebar: Display with State", () => {
  it("displays pre-existing someday event", async () => {
    await waitFor(() => {
      render(<CalendarView />, { state: weekEventState });
    });

    const sidebar = screen.getByRole("complementary");
    expect(
      within(sidebar).getByRole("button", { name: /^europe trip$/i })
    ).toBeInTheDocument();
  });
});
