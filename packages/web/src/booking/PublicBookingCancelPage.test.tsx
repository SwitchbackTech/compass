import { HotkeysProvider } from "@tanstack/react-hotkeys";
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
const slotStart = "2026-09-15T15:00:00.000Z";

function reservationGetHandler(overrides: Record<string, unknown> = {}) {
  return rest.get(
    `${ENV_WEB.API_BASEURL}/booking/reservations/${reservationId}`,
    (_req, res, ctx) =>
      res(
        ctx.status(Status.OK),
        ctx.json({
          slotStart,
          guestTimeZone: "UTC",
          durationMinutes: 30,
          hostDisplayName: "Tyler Dane",
          status: "confirmed",
          ...overrides,
        }),
      ),
  );
}

function renderCancelRoute(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    defaultPendingMs: 0,
  });
  const { wrapper } = createStoreWrapper();
  const result = render(
    <HotkeysProvider>
      <RouterProvider router={router} />
    </HotkeysProvider>,
    { wrapper },
  );
  return { ...result, router };
}

describe("PublicBookingCancelPage", () => {
  it("does not POST until the guest confirms", async () => {
    const user = userEvent.setup({ delay: null });
    let cancelPosts = 0;

    server.use(
      reservationGetHandler(),
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

  it("does not POST twice if confirm is clicked while canceling", async () => {
    const user = userEvent.setup({ delay: null });
    let cancelPosts = 0;
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });

    server.use(
      reservationGetHandler(),
      rest.post(
        `${ENV_WEB.API_BASEURL}/booking/reservations/${reservationId}/cancel`,
        async (_req, res, ctx) => {
          cancelPosts += 1;
          await hold;
          return res(ctx.status(Status.OK), ctx.json({ ok: true }));
        },
      ),
    );

    renderCancelRoute(cancelPath);

    await user.click(
      await screen.findByRole("button", { name: "Cancel this booking" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Canceling..." }),
    );
    expect(cancelPosts).toBe(1);
    release();
    expect(
      await screen.findByRole("heading", { name: "Booking canceled" }),
    ).toBeInTheDocument();
  });

  it("focuses the heading on load and tabs to the confirm button", async () => {
    const user = userEvent.setup({ delay: null });
    server.use(reservationGetHandler());

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
      reservationGetHandler(),
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
      reservationGetHandler(),
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

  it("shows host and slot details before confirm", async () => {
    server.use(reservationGetHandler());

    renderCancelRoute(cancelPath);

    expect(
      await screen.findByRole("heading", { name: "Cancel this booking?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("You are canceling a booking with Tyler Dane."),
    ).toBeInTheDocument();
    expect(screen.getByText("When")).toBeInTheDocument();
    expect(screen.getByText("Duration")).toBeInTheDocument();
    expect(screen.getByText("Timezone")).toBeInTheDocument();
    expect(screen.getByText("30 minutes")).toBeInTheDocument();
  });

  it("skips confirmation when the reservation is already cancelled", async () => {
    let cancelPosts = 0;
    server.use(
      reservationGetHandler({ status: "cancelled" }),
      rest.post(
        `${ENV_WEB.API_BASEURL}/booking/reservations/${reservationId}/cancel`,
        (_req, res, ctx) => {
          cancelPosts += 1;
          return res(ctx.status(Status.OK), ctx.json({ ok: true }));
        },
      ),
    );

    renderCancelRoute(cancelPath);

    expect(
      await screen.findByRole("heading", { name: "Booking canceled" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancel this booking" }),
    ).not.toBeInTheDocument();
    expect(cancelPosts).toBe(0);
  });

  it("returns to the confirmation page on Escape without posting", async () => {
    const user = userEvent.setup({ delay: null });
    let cancelPosts = 0;
    server.use(
      reservationGetHandler(),
      rest.post(
        `${ENV_WEB.API_BASEURL}/booking/reservations/${reservationId}/cancel`,
        (_req, res, ctx) => {
          cancelPosts += 1;
          return res(ctx.status(Status.OK), ctx.json({ ok: true }));
        },
      ),
    );

    const { router } = renderCancelRoute(cancelPath);

    expect(
      await screen.findByRole("heading", { name: "Cancel this booking?" }),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");

    expect(
      await screen.findByRole("heading", {
        name: "You are booked with Tyler Dane",
      }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(
      `/book/confirmed/${reservationId}`,
    );
    expect(cancelPosts).toBe(0);
  });

  it("does not navigate or abort when Escape is pressed during cancel POST", async () => {
    const user = userEvent.setup({ delay: null });
    let cancelPosts = 0;
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });

    server.use(
      reservationGetHandler(),
      rest.post(
        `${ENV_WEB.API_BASEURL}/booking/reservations/${reservationId}/cancel`,
        async (_req, res, ctx) => {
          cancelPosts += 1;
          await hold;
          return res(ctx.status(Status.OK), ctx.json({ ok: true }));
        },
      ),
    );

    const { router } = renderCancelRoute(cancelPath);

    await user.click(
      await screen.findByRole("button", { name: "Cancel this booking" }),
    );
    expect(
      await screen.findByRole("button", { name: "Canceling..." }),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");

    expect(
      screen.getByRole("heading", { name: "Cancel this booking?" }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(
      `/book/cancel/${reservationId}`,
    );
    expect(cancelPosts).toBe(1);

    release();
    expect(
      await screen.findByRole("heading", { name: "Booking canceled" }),
    ).toBeInTheDocument();
    expect(cancelPosts).toBe(1);
  });

  it("does not navigate on Escape from the not-found heading", async () => {
    const user = userEvent.setup({ delay: null });
    const { router } = renderCancelRoute(`/book/cancel/${reservationId}`);

    const heading = await screen.findByRole("heading", {
      name: "Booking not found",
    });
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
    await user.keyboard("{Escape}");

    expect(
      screen.getByRole("heading", { name: "Booking not found" }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(
      `/book/cancel/${reservationId}`,
    );
  });
});
