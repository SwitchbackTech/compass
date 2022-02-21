import React from "react";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { CalendarView } from "@web/views/Calendar";
import { render } from "@web/common/helpers/test.helpers";
import { weekEventState } from "@web/common/__mocks__/state.weekEvents";
import { useGetWeekViewProps } from "../weekViewHooks/useGetWeekViewProps";

describe("CalendarView: Renders", () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scroll = jest.fn();
  });
  beforeEach(() => {
    render(<CalendarView />);
  });
  it("current year in YYYY format", () => {
    const currentYear = new Date().getFullYear().toString(); // YYYY
    expect(screen.getByText(currentYear)).toBeInTheDocument;
  });

  it("navigation arrows", async () => {
    expect(screen.getByText(/</i)).toBeInTheDocument;
    expect(screen.getByText(/>/i)).toBeInTheDocument;
  });
  it("current week", () => {
    const todaysDate = new Date().getDate().toString();
    expect(todaysDate).toBeInTheDocument;
  });
  it("automatically scrolls", () => {
    expect(window.HTMLElement.prototype.scroll).toHaveBeenCalledTimes(1);
  });
});

describe("CalendarView: Renders with State", () => {
  beforeEach(() => {
    const preloadedState = weekEventState; // has to be called 'preloadedState' to render correctly
    render(<CalendarView />, { preloadedState });
  });

  it("timed and all day event", () => {
    expect(
      screen.getByRole("button", { name: /groceries/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /chill all day/i })
    ).toBeInTheDocument();
  });

  /*
  it("has correct event widths", () => {
    // mock stuff like here:
    // https://github.com/testing-library/react-testing-library/issues/353#issuecomment-510046921
    const chillBtn = screen.getByRole("button", { name: /chill all day/i });
    // const yy = chillBtn.clientWidth;
  });
  */
});
