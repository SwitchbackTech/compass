import { rest } from "msw";
import { act } from "react";
import { createMemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LEARN_CHINESE } from "@core/__mocks__/v1/events/events.misc";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { server } from "@web/__tests__/__mocks__/server/mock.server";
import { preloadedState } from "@web/__tests__/__mocks__/state/state.weekEvents";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { CalendarView } from "@web/views/Calendar";

jest.mock("@web/auth/auth.util", () => ({
  getUserId: async () => "test-user-id",
}));

describe("Sidebar: Interactions", () => {
  const router = createMemoryRouter(
    [{ index: true, Component: CalendarView }],
    { initialEntries: ["/"] },
  );

  it("opens and closes existing someday event form", async () => {
    const user = userEvent.setup();
    render(<></>, { state: preloadedState, router });

    const existing = await screen.findByRole("button", {
      name: /europe trip/i,
    });
    await act(async () => {
      await user.click(existing);
    });

    expect(await screen.findByRole("form")).toBeInTheDocument();

    await act(async () => {
      await user.keyboard("{Escape}");
    });

    await waitFor(() => {
      expect(screen.queryByRole("form")).not.toBeInTheDocument();
    });
  }, 10000);

  it("adds someday event via + and saves", async () => {
    server.use(
      rest.post(`${ENV_WEB.API_BASEURL}/event`, (_req, res, ctx) => {
        return res(ctx.json(LEARN_CHINESE));
      }),
    );
    const user = userEvent.setup();
    render(<></>, { state: preloadedState, router });

    await act(async () => {
      await user.click(screen.getAllByText("+")[0]);
    });

    const formTitle = await screen.findByRole("input");
    await act(async () => {
      await user.type(formTitle, LEARN_CHINESE.title!);
    });

    await act(async () => {
      await user.click(screen.getByText(/save/i));
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^learn chinese /i }),
      ).toBeInTheDocument();
    });
  }, 10000);
});
