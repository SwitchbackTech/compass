import React from "react";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import { render } from "@web/common/__mocks__/oldmock.render";
import { weekEventState } from "@web/common/__mocks__/state/state.weekEvents";
import {
  mockLocalStorage,
  clearLocalStorageMock,
} from "@web/common/utils/test.util";
import { CalendarView } from "@web/views/Calendar";

beforeAll(() => {
  window.HTMLElement.prototype.scroll = jest.fn();
});

describe("Sidebar", () => {
  beforeAll(() => {
    mockLocalStorage();
    localStorage.setItem("token", "secretTokenValue");
  });
  afterAll(() => {
    clearLocalStorageMock();
  });
  it("renders button to add someday events", async () => {
    // workaround to for Redux connected component act() warning
    await waitFor(() => {
      render(<CalendarView />);
      expect(screen.getByText(/\+/i)).toBeInTheDocument();
    });
  });
});

/*
describe("Sidebar: Renders with State", () => {
  beforeEach(() => {
    mockLocalStorage();
    localStorage.setItem("token", "secretTokenValue");
  });
  afterAll(() => {
    clearLocalStorageMock();
  });

    it("renders someday events", async () => {
      const preloadedState = weekEventState; // has to be called 'preloadedState' to render correctly
      await waitFor(() => {
        render(<CalendarView />, { preloadedState });
      });
      expect(screen.getByText(/europe trip/i)).toBeInTheDocument();
    });
});
*/
