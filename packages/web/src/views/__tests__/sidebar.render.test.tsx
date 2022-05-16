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

describe("Sidebar", () => {
  beforeAll(() => {
    mockLocalStorage();
    mockScroll();
    localStorage.setItem("token", "secretTokenValue");
  });
  afterAll(() => {
    clearLocalStorageMock();
  });
  it("displays everything user expects", async () => {
    await waitFor(() => {
      render(<CalendarView />);
    });

    // Someday title
    expect(screen.getByText(/someday/i)).toBeInTheDocument();
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
  // it("adds someday event to sidebar", async () => {
  //   render(<CalendarView />);
  //   console.log("todo finish...");
  // });
});

/* TODO re-enable & finish
describe("Sidebar: Renders with State", () => {
  beforeAll(() => mockScroll());
  beforeEach(() => {
    mockLocalStorage();
    localStorage.setItem("token", "secretTokenValue");
  });
  afterAll(() => {
    clearLocalStorageMock();
  });

  it("renders someday events", async () => {
    await waitFor(() => {
      render(<CalendarView />, { state: weekEventState });
    });
    expect(screen.getByText(/europe trip/i)).toBeInTheDocument();
  });
});
*/
