import { rest } from "msw";
import React, { act } from "react";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { server } from "@web/__tests__/__mocks__/server/mock.server";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { CalendarView } from "@web/views/Calendar";

it("displays alert upon server error", async () => {
  server.use(
    rest.get(`${ENV_WEB.API_BASEURL}/event`, (req, res, ctx) => {
      return res(
        ctx.status(500),
        ctx.json({
          error: "something broke",
        }),
      );
    }),
  );

  const alertMock = jest.spyOn(window, "alert").mockImplementation();
  const consoleMock = (console.error = jest.fn()); // mock so doesnt clutter test logs

  render(<CalendarView />);

  await waitFor(() => {
    expect(alertMock).toHaveBeenCalled();
  });
  expect(consoleMock).toHaveBeenCalled();
});

describe("Calendar Interactions", () => {
  describe("Now Line", () => {
    it("appears/disappears when viewing future or past week", async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(<CalendarView />);
      });

      // Check current week
      const nowLine = screen.queryByRole("separator", { name: /now line/i });
      expect(nowLine).toBeInTheDocument();

      // Check future week
      await act(async () => {
        await user.click(
          screen.getByRole("navigation", {
            name: /next week/i,
          }),
        );
      });

      expect(nowLine).not.toBeInTheDocument();
    });
  });
});
