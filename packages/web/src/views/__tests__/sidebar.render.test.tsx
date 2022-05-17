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

    // TODO - check for pre-loaded state events
  });

  it.todo("collapses sidebar after clicking toggle button");

  it.todo("displays someday event form after clicking add button");

  //interactions
  it.todo("adds someday event to sidebar");
  it.todo("displays times preview while dragging");
  it.todo("moves event from sidebar to grid after drop");
  it.todo("moves event from sidebar to all-day row after drop");

  // it("displays (preloaded) someday events", async () => {
  //   //TODO move to basic render test after this works (?)
  //   await waitFor(() => {
  //     const { debug } = render(<CalendarView />, { state: weekEventState });
  //     // debug();
  //   });
  //   await waitFor(() => {
  //     expect(
  //       screen.getByRole("button", { name: /europe trip/i })
  //     ).toBeInTheDocument();
  //   });
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
