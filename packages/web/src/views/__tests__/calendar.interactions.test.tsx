import React from "react";
import "@testing-library/jest-dom";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarView } from "@web/views/Calendar";
import { CompassRoot } from "@web/routers/index";
import { render } from "@web/common/__mocks__/mock.render";
import { febToMarState } from "@web/common/__mocks__/state/state.0227To0305";
import {
  mockLocalStorage,
  clearLocalStorageMock,
} from "@web/common/utils/test.util";

describe("Calendar Interactions", () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scroll = jest.fn();
    mockLocalStorage();
    localStorage.setItem("token", "mytoken123");
  });

  afterAll(() => {
    clearLocalStorageMock();
  });

  describe("Navigation Arrow Row", () => {
    it("navigates to previous week upon nav arrow click", async () => {
      const user = userEvent.setup();
      render(CompassRoot);

      expect(screen.queryByText(/today/i)).not.toBeInTheDocument();

      await act(async () => {
        await user.click(
          screen.getByRole("navigation", { name: /previous week/i })
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/today/i)).toBeInTheDocument();
      });
    });

    it("renders today only when on different week than current", async () => {
      const user = userEvent.setup();

      render(<CalendarView />);

      expect(screen.queryByText(/today/i)).not.toBeInTheDocument();
      await act(async () => {
        await user.click(
          screen.getByRole("navigation", { name: /previous week/i })
        );
      });
      expect(screen.getByText(/today/i)).toBeInTheDocument();

      // user returns to original week
      await act(async () => {
        await user.click(
          screen.getByRole("navigation", {
            name: /next week/i,
          })
        );
      });
      expect(screen.queryByText(/today/i)).not.toBeInTheDocument();

      await act(async () => {
        await user.click(
          screen.getByRole("navigation", {
            name: /next week/i,
          })
        );
      });
      expect(screen.getByText(/today/i)).toBeInTheDocument();
    });
  });

  describe("Now Line", () => {
    it("disappears when viewing future week", async () => {
      const user = userEvent.setup();
      render(<CalendarView />);

      await act(async () => {
        await user.click(
          screen.getByRole("navigation", {
            name: /next week/i,
          })
        );
      });
      expect(
        screen.queryByRole("separator", { name: /now line/i })
      ).not.toBeInTheDocument();
    });
    it("disappears when viewing past week", async () => {
      const user = userEvent.setup();
      render(<CalendarView />);

      await act(async () => {
        await user.click(
          screen.getByRole("navigation", { name: /previous week/i })
        );
      });
      expect(
        screen.queryByRole("separator", { name: /now line/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("Event Form", () => {
    it("opens after clicking all-day event (and not before)", async () => {
      /*
      note: this doesn't test if an event is effectively 'hidden' from a user 
      because the row logic was incorrect and allowed overlapping events. 
        - the event may be on the DOM and clickable by testing-library,
          but if a user tried clicking in that spot, she would only 
          be able to click the event that's on the 'top' layer
      */
      const user = userEvent.setup();
      render(<CalendarView />, { state: febToMarState });

      // just testing a handful of events to minimize slowness
      const titles = [
        // all-day events
        "multiweek event",
        "Mar 1",
        // regular events
        "Ty & Tim",
      ];

      for (const t of titles) {
        expect(screen.queryByDisplayValue(t)).not.toBeInTheDocument(); // shouldnt show form before being clicked
        await act(async () => {
          await user.click(screen.getByTitle(t));
        });

        await waitFor(() => {
          expect(screen.getByDisplayValue(t)).toBeInTheDocument();
        });
        /*
        TODO: press ESC and confirm form disappears
        opt: 
          user.keyboard ...
        opt (wasnt working initially):
          fireEvent.keyDown(screen.getByText(/today/i), {
            key: "Escape",
            code: "Escape",
            charCode: 27,
          });

        expect(screen.queryByDisplayValue(t)).not.toBeInTheDocument(); // shouldnt show form before being clicked
        */
      }
    });

    it("closes when clicking page heading", async () => {
      const user = userEvent.setup();
      render(<CalendarView />, { state: febToMarState });

      await act(async () => {
        await user.click(screen.getByRole("button", { name: "Mar 1" }));
      });

      await act(async () => {
        await user.click(screen.getByRole("heading", { level: 1 }));
      });

      await waitFor(() => {
        expect(screen.queryByRole("form")).not.toBeInTheDocument();
      });
    });

    it("deletes event after clicking trash icon", async () => {
      const user = userEvent.setup();
      render(<CalendarView />, { state: febToMarState });

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

      expect(
        screen.queryByRole("button", {
          name: /delete event/i,
        })
      ).not.toBeInTheDocument();
    });

    describe("DatePicker", () => {
      it("closes when clicking outside of form, while keeping form open", async () => {
        const user = userEvent.setup();
        render(<CalendarView />, { state: febToMarState });

        const eventWithTimesBtn = screen.getByRole("button", {
          // accept any times because times will be different if
          // CI server in different timezone than you
          name: /climb (\d|\d\d):\d\d(a|p)m - (\d|\d\d):00(a|p)m/i,
        });

        await act(async () => {
          await user.click(eventWithTimesBtn); // open event
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
        expect(screen.getByRole("form")).toBeInTheDocument();
      });
    });
  });

  describe("All Day Row", () => {
    it.todo("displays preview + form on the column that was clicked");
    // ^ this week and past/future week (cuz diff column widths)
  });
  describe("All Day Events", () => {
    it("adds 1-day event somewhere on DOM", async () => {
      const user = userEvent.setup();
      const { container } = render(<CalendarView />, {
        state: febToMarState,
      });

      await act(async () => {
        await user.click(container.querySelector("#allDayGrid"));
      });
      await waitFor(() => {
        expect(screen.getByRole("form")).toBeInTheDocument();
      });

      await act(async () => {
        await user.type(screen.getByPlaceholderText(/title/i), "Hello, World");
      });

      await act(async () => {
        await userEvent.keyboard("{Enter}");
      });

      // TODO: update test to ensure its on the expected day column
      expect(screen.getByDisplayValue("Hello, World")).toBeInTheDocument();
    });
  });

  describe("Regular Events", () => {
    it("toggles times when clicking them", async () => {
      const user = userEvent.setup();
      render(<CalendarView />, { state: febToMarState });

      const eventWithTimesBtn = screen.getByRole("button", {
        name: /climb (\d|\d\d):\d\d(a|p)m - (\d|\d\d):00(a|p)m/i,
      });
      const hideTimesBox = within(eventWithTimesBtn).getByRole("textbox", {
        name: /click to hide times/i,
      });

      await act(async () => {
        // user tries to hide times
        await user.click(hideTimesBox);
      });

      const eventWithoutTimes = screen.getByRole("button", {
        name: /climb/i, // no times
      });
      expect(eventWithoutTimes).toBeInTheDocument();

      const showTimesBox = within(eventWithoutTimes).getByRole("textbox", {
        name: /show times/i,
      });

      await act(async () => {
        // user tries to show times
        await user.click(showTimesBox);
      });

      expect(eventWithTimesBtn).toBeInTheDocument();
    });
  });
});
/* 
  Finish this once adding better error-handling
    - Difficult to mock `alert`, so not worth spending time on it,
    since we'll have a more robust way of handling errors anyway
    - Consider using redux, similar to this example:
        https://testing-library.com/docs/react-testing-library/example-intro/#system-under-test
    

  it("sends alert upon server error", async () => {
    server.use(
      rest.get("/api/event", (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({
            errorMessage: `sth bad happened`,
          })
        );
      })
    );
    // expect(screen.getByRole("alert")).toBeInTheDocument;
    // ...
  });
  */
