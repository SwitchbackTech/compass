import React from "react";
import "@testing-library/jest-dom";
import {
  act,
  prettyDOM,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarView } from "@web/views/Calendar";
import {
  MARCH_1,
  MULTI_WEEK,
  TY_TIM,
} from "@web/common/__mocks__/events/feb27ToMar5";
import { render } from "@web/common/__mocks__/mock.render";
import { febToMarState } from "@web/common/__mocks__/state/state.0227To0305";
import {
  mockLocalStorage,
  clearLocalStorageMock,
  mockScroll,
} from "@web/common/utils/test.util";
import { server } from "@web/common/__mocks__/server/mock.server";
import { feb27ToMar5Handlers } from "@web/common/__mocks__/server/mock.handlers";

const _closeForm = async () => {
  //TODO close out
  await act(async () => {
    await user.click(screen.getByRole("heading", { level: 1 }));
  });

  await waitFor(() => {
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });
};

const _confirmCorrectEventFormIsOpen = (eventName: string) => {
  expect(
    within(screen.getByRole("form")).getByText(eventName)
  ).toBeInTheDocument();
};

describe("Calendar Interactions", () => {
  beforeAll(() => {
    mockScroll();
    server.listen();
    // server.use(feb27ToMar5Handlers);
    mockLocalStorage();
    localStorage.setItem("token", "mytoken123");
  });
  afterEach(() => {
    server.resetHandlers();
  });
  afterAll(() => {
    clearLocalStorageMock();
  });

  describe("Now Line + Today Button", () => {
    it("appear/disappear when viewing future or past week", async () => {
      const user = userEvent.setup();
      render(<CalendarView />);

      /* current week */
      const todayBtn = screen.queryByText(/today/i);
      const nowLine = screen.queryByRole("separator", { name: /now line/i });

      expect(todayBtn).not.toBeInTheDocument();
      expect(nowLine).toBeInTheDocument();

      /* future week */
      await act(async () => {
        await user.click(
          screen.getByRole("navigation", {
            name: /next week/i,
          })
        );
      });

      expect(screen.getByText(/today/i)).toBeInTheDocument();
      expect(nowLine).not.toBeInTheDocument();

      /* past week */
      await act(async () => {
        await user.click(screen.getByText(/today/i));
      });

      await act(async () => {
        await user.click(
          screen.getByRole("navigation", {
            name: /previous week/i,
          })
        );
      });

      expect(screen.getByText(/today/i)).toBeInTheDocument();
      expect(nowLine).not.toBeInTheDocument();
    });
  });

  describe("Event Form", () => {
    it.todo("only allows 1 form to be open at a time"); // currently allows concurrent someday and grid forms

    server.use(feb27ToMar5Handlers);
    it("opens when clicking events", async () => {
      const user = userEvent.setup();
      render(<CalendarView />, { state: febToMarState });
      expect(screen.queryByRole("form")).not.toBeInTheDocument();

      /* all-day event */
      await act(async () => {
        await user.click(screen.getByRole("button", { name: /Mar 1/i }));
      });
      _confirmCorrectEventFormIsOpen(MARCH_1.title);

      /* timed event */
      await act(async () => {
        await user.click(screen.getByRole("button", { name: /Ty & Tim/i }));
      });
      _confirmCorrectEventFormIsOpen(TY_TIM.title);

      /* multi-week event */
      await act(async () => {
        await user.click(
          screen.getByRole("button", { name: /multiweek event/i })
        );
      });
      _confirmCorrectEventFormIsOpen(MULTI_WEEK.title);

      /* someday event */
      await act(async () => {
        await user.click(
          screen.getByRole("button", { name: /Takeover world/i })
        );
      });

      // using testid because multiple forms currently allowed
      // converted to _confirmCorrect...() once ^ is fixed
      expect(
        within(screen.getByTestId("somedayForm")).getByText("Takeover world")
      ).toBeInTheDocument();
    });

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
    it("shows preview while typing in form", async () => {
      const user = userEvent.setup();
      const { container } = render(<CalendarView />, {
        state: febToMarState,
      });

      const allDayGrid = container.querySelector("#allDayGrid");

      await act(async () => {
        await user.click(allDayGrid);
      });
      await waitFor(() => {
        expect(screen.getByRole("form")).toBeInTheDocument();
      });

      await act(async () => {
        await user.type(screen.getByPlaceholderText(/title/i), "Hello, World");
      });
      // TODO: update test to ensure its on the expected day column
      expect(
        within(allDayGrid).getByDisplayValue("Hello, World")
      ).toBeInTheDocument();

      // it dont show up after this -- hmm
      // await act(async () => {
      //   await user.click(screen.getByText(/save/i));
      // });
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
*/
it.todo("sends alert upon server error");
/*
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
