import React from "react";
import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserEvent } from "@testing-library/user-event/dist/types/setup/setup";
import { CLIMB, MULTI_WEEK, TY_TIM } from "@core/__mocks__/events/events.misc";
import { CalendarView } from "@web/views/Calendar";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { preloadedState } from "@web/__tests__/__mocks__/state/state.weekEvents";

jest.mock("@web/views/Calendar/hooks/mouse/useEventListener", () => ({
  useEventListener: jest.fn(),
}));

describe("Event Form", () => {
  // it("opens when clicking events", async () => {
  //   const user = userEvent.setup();
  //   render(<CalendarView />, { state: preloadedState });
  //   expect(screen.queryByRole("form")).not.toBeInTheDocument();
  //   /* timed event */
  //   await user.click(screen.getByRole("button", { name: /Ty & Tim/i }));
  //   await _confirmCorrectEventFormIsOpen(TY_TIM.title);
  //   /* multi-week event */
  //   await _clickHeading(user);
  //   await user.click(screen.getByRole("button", { name: /multiweek event/i }));
  //   await _confirmCorrectEventFormIsOpen(MULTI_WEEK.title);
  //   /* someday event */
  //   await _clickHeading(user);
  //   await user.click(screen.getByRole("button", { name: /takeover world/i }));
  //   expect(
  //     within(screen.getByTestId("somedayForm")).getByText("Takeover world")
  //   ).toBeInTheDocument();
  // }, 10000);
  it("closes when clicking outside", async () => {
    render(<CalendarView />, { state: preloadedState });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: CLIMB.title }));
    await _clickHeading(user);
    await waitFor(() => {
      expect(screen.queryByRole("form")).not.toBeInTheDocument();
    });
  }, 10000);
  // it("deletes event after clicking trash icon", async () => {
  //   const user = userEvent.setup();
  //   render(<CalendarView />, { state: preloadedState });

  //   await user.click(screen.getByRole("button", { name: "Europe Trip >" }));

  //   const form = screen.getByRole("form");
  //   const deleteBtn = within(form).getByRole("button");
  //   await user.click(
  //     deleteBtn
  //     // screen.getByRole("button", {
  //     //   name: /delete someday event/i,
  //     // })
  //   );
  //   await waitFor(() => {
  //     expect(
  //       screen.queryByRole("button", {
  //         name: /delete someday event/i,
  //       })
  //     ).not.toBeInTheDocument();
  //   });
  // }, 10000);
  describe("DatePicker", () => {
    it("dialog is not open by default", async () => {
      const user = userEvent.setup();
      const { container } = render(<CalendarView />, { state: preloadedState });
      await user.click(
        screen.getByRole("button", {
          name: /climb/i,
        })
      );
      expect(container.getElementsByClassName("startDatePicker")).toHaveLength(
        0
      );
    });
  });
});

/***********
 * Helpers *
 ***********/
const _clickHeading = async (user: UserEvent) => {
  await user.click(screen.getByRole("heading", { level: 1 }));
};

const _confirmCorrectEventFormIsOpen = async (eventName: string) => {
  await waitFor(() => {
    expect(
      within(screen.getByRole("form")).getByText(eventName)
    ).toBeInTheDocument();
  });
};
