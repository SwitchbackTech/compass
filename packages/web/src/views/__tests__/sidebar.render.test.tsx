import React from "react";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import { render } from "@web/common/__mocks__/mock.render";
import { weekEventState } from "@web/common/__mocks__/state/state.weekEvents";
import {
  mockLocalStorage,
  clearLocalStorageMock,
  mockScroll,
} from "@web/common/utils/test.util";
import { CalendarView } from "@web/views/Calendar";
import userEvent from "@testing-library/user-event";

describe("Sidebar", () => {
  beforeAll(() => {
    mockLocalStorage();
    mockScroll();
    localStorage.setItem("token", "secretTokenValue");
  });
  afterAll(() => {
    clearLocalStorageMock();
  });
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

  it("adds someday event to sidebar", async () => {
    await waitFor(() => {
      render(<CalendarView />);
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /\+/i }));
    expect(screen.getByRole("form")).toBeInTheDocument();
  });

  //interactions
  describe("Drag & Drop", () => {
    it("moves event from sidebar to grid after drop", async () => {
      await waitFor(() => {
        render(<CalendarView />, { state: weekEventState });
      });
      expect(
        screen.getByRole("button", { name: /europe trip/i })
      ).toBeInTheDocument();
    });
  });
  it.todo("displays times preview while dragging");
});
