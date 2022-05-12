import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { render } from "@web/common/__mocks__/simple.mock.render";
import { CalendarView } from "@web/views/Calendar";
import {
  mockLocalStorage,
  clearLocalStorageMock,
} from "@web/common/utils/test.util";
import React from "react";
import { getWeekDayLabel } from "@web/ducks/events/event.utils";
import dayjs from "dayjs";
/*
unsuccessful in getting keyboard events to fire
might have to refactor how keyboard shortcuts are setup in app

describe("Calendar shortcuts", () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scroll = jest.fn();
    mockLocalStorage();
    localStorage.setItem("token", "mytoken123");
  });

  afterAll(() => {
    clearLocalStorageMock();
  });
  it("navigates to today's week after pressing 't'", async () => {
    const user = userEvent.setup({ keyboardMap: [{ code: "84" }] });
    render(<CalendarView />);

    const todayLabel = getWeekDayLabel(dayjs());
    expect(screen.getByTitle(todayLabel)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /previous week/i }));
    expect(screen.queryByTitle(todayLabel)).not.toBeInTheDocument();

    await user.keyboard("84");
    await waitFor(() => {
      expect(screen.getByTitle(todayLabel)).toBeInTheDocument();
    });
  });
});
*/
