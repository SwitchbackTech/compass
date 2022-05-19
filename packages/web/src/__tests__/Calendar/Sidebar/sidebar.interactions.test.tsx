import React from "react";
import { rest } from "msw";
import "@testing-library/jest-dom";
import { act, screen, waitFor, within } from "@testing-library/react";
import { LEARN_CHINESE } from "@core/__mocks__/events/events.misc";
import userEvent from "@testing-library/user-event";
import { server } from "@web/__tests__/__mocks__/server/mock.server";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { preloadedState } from "@web/__tests__/__mocks__/state/state.weekEvents";
import { CalendarView } from "@web/views/Calendar";
import { API_BASEURL } from "@web/common/constants/web.constants";

describe("Sidebar: Interactions", () => {
  it("adds someday event to sidebar", async () => {
    server.use(
      rest.post(`${API_BASEURL}/event`, (_, res, ctx) => {
        return res(ctx.json(LEARN_CHINESE));
      })
    );

    const user = userEvent.setup();
    await waitFor(() => {
      render(<CalendarView />, { state: preloadedState });
    });

    const sidebar = screen.getByRole("complementary");

    await act(async () => {
      await user.click(
        within(sidebar).getByRole("button", { name: /add someday event/i })
      );
    });

    await act(async () => {
      await user.type(
        screen.getByRole("input", { name: /title/i }),
        LEARN_CHINESE.title
      );
    });

    // TODO: shows preview while typing
    // expect(within(sidebar).getByDisplayValue("learn")).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByText(/save/i));
    });

    await waitFor(() => {
      expect(
        within(sidebar).getByRole("button", { name: /^learn chinese$/i })
      ).toBeInTheDocument();
    });
  }, 10000);
  describe("Drag & Drop", () => {
    it.todo("moves event from sidebar to grid after drop");

    it.todo("displays times preview while dragging");
  });
});
