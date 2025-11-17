import { rest } from "msw";
import { act } from "react";
import { createMemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { server } from "@web/__tests__/__mocks__/server/mock.server";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { CalendarView } from "@web/views/Calendar";

const router = createMemoryRouter([{ index: true, Component: CalendarView }], {
  initialEntries: ["/"],
});

describe("Calendar Interactions", () => {
  describe("Fetch Events", () => {
    it("displays alert upon server error", async () => {
      server.use(
        rest.get(`${ENV_WEB.API_BASEURL}/event`, (_req, res, ctx) => {
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

      await act(() => render(<></>, { router }));

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalled();
      });
      expect(consoleMock).toHaveBeenCalled();
    });
  });

  describe("Now Line", () => {
    it("appears/disappears when viewing future or past week", async () => {
      const user = userEvent.setup();

      await act(() => render(<></>, { router }));

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
