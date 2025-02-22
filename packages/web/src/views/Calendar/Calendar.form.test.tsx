import React, { act } from "react";
import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent, { UserEvent } from "@testing-library/user-event";
import { CLIMB } from "@core/__mocks__/events/events.misc";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { preloadedState } from "@web/__tests__/__mocks__/state/state.weekEvents";
import { CalendarView } from "@web/views/Calendar";

jest.mock("@web/views/Calendar/hooks/mouse/useEventListener", () => ({
  useEventListener: jest.fn(),
}));

describe("Event Form", () => {
  //   it("opens when clicking events", async () => {
  //     const user = userEvent.setup();
  //     render(<CalendarView />, { state: preloadedState });
  //     expect(screen.queryByRole("form")).not.toBeInTheDocument();
  /* timed event */
  // await act(async () => {
  //   await user.click(screen.getByRole("button", { name: /Ty & Tim/i }));
  //   await _confirmCorrectEventFormIsOpen(TY_TIM.title);
  // });
  /* multi-week event */
  // await act(async () => {
  //   await _clickHeading(user);
  //   await user.click(
  //     screen.getByRole("button", { name: /multiweek event/i })
  //   );
  // });
  // await waitFor(
  //   () => {
  //     expect(screen.getByRole("form")).toBeInTheDocument();
  //   },
  //   { timeout: 10000 }
  // );
  // await _confirmCorrectEventFormIsOpen(MULTI_WEEK.title);
  // await waitFor(() => {
  //   expect(
  //     within(screen.getByRole("form")).getByText(MULTI_WEEK.title)
  //   ).toBeInTheDocument();
  // });
  // /* someday event */
  // await _clickHeading(user);
  // await user.click(screen.getByRole("button", { name: /takeover world/i }));
  // expect(
  //   within(screen.getRole("form", name: {"Someday Event Form"})).getByText("Takeover world")
  // ).toBeInTheDocument();
  // }, 20000);
  it("closes after clicking outside", async () => {
    render(<CalendarView />, { state: preloadedState });
    const user = userEvent.setup();

    await act(async () => {
      await user.click(screen.getByRole("button", { name: CLIMB.title }));
      await _clickHeading(user);
    });

    await waitFor(() => {
      expect(screen.queryByRole("form")).not.toBeInTheDocument();
    });
  }, 10000);
  it("closes after clicking trash icon", async () => {
    const user = userEvent.setup();
    render(<CalendarView />, { state: preloadedState });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Europe Trip < >" }));
    });

    const form = screen.getByRole("form");

    await act(async () => {
      await user.click(
        within(form).getByRole("button", {
          name: /delete someday event/i,
        }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole("form")).not.toBeInTheDocument();
    });
  }, 10000);
  describe("DatePicker", () => {
    it("does not open dialog by default", async () => {
      const user = userEvent.setup();
      const { container } = render(<CalendarView />, { state: preloadedState });

      await act(async () => {
        await user.click(
          screen.getByRole("button", {
            name: /climb/i,
          }),
        );
      });

      expect(container.getElementsByClassName("startDatePicker")).toHaveLength(
        0,
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
      within(screen.getByRole("form")).getByText(eventName),
    ).toBeInTheDocument();
  });
};
