import React from "react";
import { rest } from "msw";
import "@testing-library/jest-dom";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarView } from "@web/views/Calendar";
import { render } from "@web/common/__mocks__/mock.render";
import { preloadedState } from "@web/common/__mocks__/state/state.weekEvents";
import { server } from "@web/common/__mocks__/server/mock.server";
import { API_BASEURL } from "@web/common/constants/web.constants";
it("displays alert upon server error", async () => {
  server.use(
    rest.get(`${API_BASEURL}/event`, (req, res, ctx) => {
      return res(
        ctx.status(500),
        ctx.json({
          errorMessage: "something broke",
        })
      );
    })
  );

  const alertMock = jest.spyOn(window, "alert").mockImplementation();
  const consoleLogMock = (console.log = jest.fn()); // mock so doesnt clutter test logs

  render(<CalendarView />);

  await waitFor(() => {
    expect(alertMock).toHaveBeenCalledTimes(1);
  });
  expect(consoleLogMock).toHaveBeenCalledTimes(1);
});

describe("Calendar Interactions", () => {
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

  describe("All Day Row", () => {
    it.todo("displays preview + form on the column that was clicked");
    // ^ this week and past/future week (cuz diff column widths)
  });
  describe("All Day Events", () => {
    it("shows preview while typing in form", async () => {
      const user = userEvent.setup();
      const { container } = render(<CalendarView />, {
        state: preloadedState,
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
      expect(
        within(allDayGrid).getByDisplayValue("Hello, World")
      ).toBeInTheDocument();
    });
  });

  describe("Regular Events", () => {
    it("toggles times when clicking them", async () => {
      server.use(
        rest.put(
          `${API_BASEURL}/event/62322b127837957382660217`,
          (req, res, ctx) => {
            return res(
              ctx.json({
                _id: "62322b127837957382660217",
                gEventId:
                  "ccq34eb261j3ab9jckpj6b9kcos6cbb26pi38b9pc5i64e9mcgp3ao9p6o",
                user: "6227e1a1623abad10d70afbf",
                origin: "googleimport",
                title: "Climb",
                description: "",
                priorities: [],
                isAllDay: false,
                isTimesShown: false, //<-- key line here
                startDate: "2022-03-01T17:00:00-06:00",
                endDate: "2022-03-01T19:00:00-06:00",
                priority: "work",
              })
            );
          }
        )
      );

      const user = userEvent.setup();
      render(<CalendarView />, { state: preloadedState });

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

      const eventWithoutTimes2 = screen.queryByRole("button", {
        name: /climb/i,
      });

      expect(eventWithoutTimes2).toBeInTheDocument();
    });
  });
});
