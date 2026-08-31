import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { rest } from "msw";
import { Status } from "@core/errors/status.codes";
import { server } from "@web/__tests__/__mocks__/server/mock.server";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { routeTree } from "@web/routers/router.routes";
import { describe, expect, it } from "bun:test";

const reservationId = "000000000000000000000099";
const cancelPath = `/book/cancel/${reservationId}?token=abc`;

function renderCancelRoute(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    defaultPendingMs: 0,
  });
  const { wrapper } = createStoreWrapper();
  return render(<RouterProvider router={router} />, { wrapper });
}

describe("PublicBookingCancelPage", () => {
  it("does not POST until the guest confirms", async () => {
    const user = userEvent.setup({ delay: null });
    let cancelPosts = 0;

    server.use(
      rest.post(
        `${ENV_WEB.API_BASEURL}/booking/reservations/${reservationId}/cancel`,
        async (_req, res, ctx) => {
          cancelPosts += 1;
          return res(ctx.status(Status.OK), ctx.json({ ok: true }));
        },
      ),
    );

    renderCancelRoute(cancelPath);

    expect(
      await screen.findByRole("heading", { name: "Cancel this booking?" }),
    ).toBeInTheDocument();
    expect(cancelPosts).toBe(0);

    await user.click(
      screen.getByRole("button", { name: "Cancel this booking" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Booking canceled" }),
    ).toBeInTheDocument();
    expect(cancelPosts).toBe(1);
  });

  it("focuses the heading on load and tabs to the confirm button", async () => {
    const user = userEvent.setup({ delay: null });

    renderCancelRoute(cancelPath);

    const heading = await screen.findByRole("heading", {
      name: "Cancel this booking?",
    });
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });

    await user.tab();
    expect(
      screen.getByRole("button", { name: "Cancel this booking" }),
    ).toHaveFocus();
  });

  it("shows a distinct error heading from the canceled state", async () => {
    const user = userEvent.setup({ delay: null });

    server.use(
      rest.post(
        `${ENV_WEB.API_BASEURL}/booking/reservations/${reservationId}/cancel`,
        (_req, res, ctx) =>
          res(ctx.status(Status.INTERNAL_SERVER), ctx.json({})),
      ),
    );

    renderCancelRoute(cancelPath);

    await user.click(
      await screen.findByRole("button", { name: "Cancel this booking" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Could not cancel booking" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Booking canceled" }),
    ).not.toBeInTheDocument();
  });

  it("shows not-found without posting when the token is missing", async () => {
    let cancelPosts = 0;
    server.use(
      rest.post(
        `${ENV_WEB.API_BASEURL}/booking/reservations/${reservationId}/cancel`,
        (_req, res, ctx) => {
          cancelPosts += 1;
          return res(ctx.status(Status.OK), ctx.json({ ok: true }));
        },
      ),
    );

    renderCancelRoute(`/book/cancel/${reservationId}`);

    expect(
      await screen.findByRole("heading", { name: "Booking not found" }),
    ).toBeInTheDocument();
    expect(cancelPosts).toBe(0);
  });
});
