import React from "react";
import "@testing-library/jest-dom";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MARCH_1,
  MULTI_WEEK,
  TY_TIM,
} from "@core/__mocks__/events/events.misc";
import { CalendarView } from "@web/views/Calendar";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { preloadedState } from "@web/__tests__/__mocks__/state/state.weekEvents";

describe("Event Form", () => {
  it.todo("only allows 1 form to be open at a time"); // currently allows concurrent someday and grid forms

  it("opens when clicking events", async () => {
    const user = userEvent.setup();

    await waitFor(() => {
      render(<CalendarView />, { state: preloadedState });
    });
    expect(screen.queryByRole("form")).not.toBeInTheDocument();

    /* all-day event */
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Mar 1/i }));
    });
    await _confirmCorrectEventFormIsOpen(MARCH_1.title);

    /* timed event */
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Ty & Tim/i }));
    });
    await _confirmCorrectEventFormIsOpen(TY_TIM.title);

    /* multi-week event */
    await act(async () => {
      await user.click(
        screen.getByRole("button", { name: /multiweek event/i })
      );
    });
    await _confirmCorrectEventFormIsOpen(MULTI_WEEK.title);

    /* someday event */
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Takeover world/i }));
    });

    // using testid because multiple forms currently allowed
    // converted to _confirmCorrect...() once ^ is fixed
    await waitFor(() => {
      expect(
        within(screen.getByTestId("somedayForm")).getByText("Takeover world")
      ).toBeInTheDocument();
    });
  }, 10000);

  it("closes when clicking outside or pressing ESC", async () => {
    /*
        attempt at ESC-ing
        opt: 
          user.keyboard ...
        opt (wasnt working initially):
          fireEvent.keyDown(screen.getByText(/today/i), {
            key: "Escape",
            code: "Escape",
            charCode: 27,
          });
        */

    const user = userEvent.setup();
    render(<CalendarView />, { state: preloadedState });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: MARCH_1.title }));
    });

    await act(async () => {
      await user.click(screen.getByRole("heading", { level: 1 }));
    });

    await waitFor(() => {
      expect(screen.queryByRole("form")).not.toBeInTheDocument();
    });
  }, 10000);

  it("deletes event after clicking trash icon", async () => {
    const user = userEvent.setup();
    await waitFor(() => {
      render(<CalendarView />, { state: preloadedState });
    });

    await act(async () => {
      await user.click(screen.getByTitle("Climb")); // open event
    });

    await act(async () => {
      await user.click(
        screen.getByRole("button", {
          name: /delete event/i,
        })
      );
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("button", {
          name: /delete event/i,
        })
      ).not.toBeInTheDocument();
    });
  }, 10000);

  describe("DatePicker", () => {
    it("closes when clicking outside of form, while keeping form open", async () => {
      const user = userEvent.setup();
      render(<CalendarView />, { state: preloadedState });

      await act(async () => {
        await user.click(
          screen.getByRole("button", {
            // accept any times because times will be different if
            // CI server in different timezone than you
            name: /climb (\d|\d\d):\d\d(a|p)m - (\d|\d\d):00(a|p)m/i,
          })
        );
      });
      const startDatePicker = await waitFor(() => {
        screen.getAllByRole("tab", {
          name: /mar 01/i,
        })[0];
      });

      await act(async () => {
        await user.click(startDatePicker); // picker should open
      });

      await act(async () => {
        // picker should close
        await user.click(screen.getByRole("form"));
      });

      // looks for the date input that appears when editing
      // (instead of date picker, because sidebar month picker still present)
      const tablist = screen.getByRole("tablist");
      expect(within(tablist).queryByRole("textbox")).not.toBeInTheDocument();

      // form is still open
      await waitFor(() => {
        expect(screen.getByRole("form")).toBeInTheDocument();
      });
    });
  });
});

/***********
 * Helpers *
 ***********/
const _confirmCorrectEventFormIsOpen = async (eventName: string) => {
  await waitFor(() => {
    expect(
      within(screen.getByRole("form")).getByText(eventName)
    ).toBeInTheDocument();
  });
};
