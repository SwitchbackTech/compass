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

function renderBookingRoute(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    defaultPendingMs: 0,
  });
  const { wrapper } = createStoreWrapper();
  const result = render(<RouterProvider router={router} />, { wrapper });
  return { ...result, router };
}

const slotStart = "2026-09-01T15:00:00.000Z";

const publicPagePayload = (overrides: Record<string, unknown> = {}) => ({
  hostDisplayName: "Tyler Dane",
  durationMinutes: 30,
  timeZone: "America/Chicago",
  enabled: true,
  maxHorizonDays: 60,
  ...overrides,
});

describe("PublicBookingPage", () => {
  it("shows a generic not-found state for an unknown slug", async () => {
    renderBookingRoute("/book/unknown-host");

    expect(
      await screen.findByRole("heading", { name: "Booking page not found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/may be incorrect or the host has turned booking off/),
    ).toBeInTheDocument();
  });

  it("labels times in the guest timezone and confirms a booking", async () => {
    const user = userEvent.setup({ delay: null });
    let postedBody: unknown;

    server.use(
      rest.get(
        `${ENV_WEB.API_BASEURL}/booking/pages/tylerdane`,
        (_req, res, ctx) =>
          res(ctx.status(Status.OK), ctx.json(publicPagePayload())),
      ),
      rest.get(
        `${ENV_WEB.API_BASEURL}/booking/pages/tylerdane/slots`,
        (_req, res, ctx) =>
          res(
            ctx.status(Status.OK),
            ctx.json({
              bookable: true,
              slots: [{ slotStart, slotEnd: "2026-09-01T15:30:00.000Z" }],
            }),
          ),
      ),
      rest.post(
        `${ENV_WEB.API_BASEURL}/booking/pages/tylerdane/reservations`,
        async (req, res, ctx) => {
          postedBody = await req.json();
          return res(
            ctx.status(Status.OK),
            ctx.json({
              reservationId: "000000000000000000000099",
              slotStart,
              slotEnd: "2026-09-01T15:30:00.000Z",
              guestTimeZone: "UTC",
              cancelUrl:
                "https://compasscalendar.com/book/cancel/000000000000000000000099?token=abc",
            }),
          );
        },
      ),
    );

    renderBookingRoute("/book/tylerdane");

    expect(
      await screen.findByRole("heading", { name: "Book with Tyler Dane" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main").parentElement).toHaveAttribute(
      "data-document-scroll",
    );
    expect(
      await screen.findByText(/Times shown in your timezone/),
    ).toBeInTheDocument();

    await user.click(
      await screen.findByRole("button", { name: /3:00 PM|15:00/i }),
    );
    await user.type(screen.getByLabelText("Name"), "Guest User");
    await user.type(screen.getByLabelText("Email"), "guest@example.com");
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));

    expect(
      await screen.findByRole("heading", {
        name: "You are booked with Tyler Dane",
      }),
    ).toBeInTheDocument();
    expect(postedBody).toMatchObject({
      slotStart,
      guestName: "Guest User",
      guestEmail: "guest@example.com",
    });
  });

  it("shows unavailable when bookable is false", async () => {
    server.use(
      rest.get(
        `${ENV_WEB.API_BASEURL}/booking/pages/tylerdane`,
        (_req, res, ctx) =>
          res(ctx.status(Status.OK), ctx.json(publicPagePayload())),
      ),
      rest.get(
        `${ENV_WEB.API_BASEURL}/booking/pages/tylerdane/slots`,
        (_req, res, ctx) =>
          res(ctx.status(Status.OK), ctx.json({ slots: [], bookable: false })),
      ),
    );

    renderBookingRoute("/book/tylerdane");

    expect(
      await screen.findByRole("heading", {
        name: "Booking temporarily unavailable",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/week/i)).not.toBeInTheDocument();
  });

  it("refreshes slots and shows a conflict message on 409", async () => {
    const user = userEvent.setup({ delay: null });
    let slotRequests = 0;

    server.use(
      rest.get(
        `${ENV_WEB.API_BASEURL}/booking/pages/tylerdane`,
        (_req, res, ctx) =>
          res(ctx.status(Status.OK), ctx.json(publicPagePayload())),
      ),
      rest.get(
        `${ENV_WEB.API_BASEURL}/booking/pages/tylerdane/slots`,
        (_req, res, ctx) => {
          slotRequests += 1;
          return res(
            ctx.status(Status.OK),
            ctx.json({
              bookable: true,
              slots: [{ slotStart, slotEnd: "2026-09-01T15:30:00.000Z" }],
            }),
          );
        },
      ),
      rest.post(
        `${ENV_WEB.API_BASEURL}/booking/pages/tylerdane/reservations`,
        (_req, res, ctx) => res(ctx.status(Status.CONFLICT), ctx.json({})),
      ),
    );

    renderBookingRoute("/book/tylerdane");

    await screen.findByRole("heading", { name: "Book with Tyler Dane" });
    await user.click(
      await screen.findByRole("button", { name: /3:00 PM|15:00/i }),
    );
    await user.type(screen.getByLabelText("Name"), "Guest User");
    await user.type(screen.getByLabelText("Email"), "guest@example.com");
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This time is no longer available. Pick another slot.",
    );
    await waitFor(() => {
      expect(slotRequests).toBeGreaterThan(1);
    });
  });

  it("does not boot the calendar shortcut overlay on public booking routes", async () => {
    server.use(
      rest.get(
        `${ENV_WEB.API_BASEURL}/booking/pages/tylerdane`,
        (_req, res, ctx) =>
          res(ctx.status(Status.OK), ctx.json(publicPagePayload())),
      ),
      rest.get(
        `${ENV_WEB.API_BASEURL}/booking/pages/tylerdane/slots`,
        (_req, res, ctx) =>
          res(ctx.status(Status.OK), ctx.json({ slots: [], bookable: true })),
      ),
    );

    renderBookingRoute("/book/tylerdane");

    await screen.findByRole("heading", { name: "Book with Tyler Dane" });
    expect(screen.queryByText(/Keyboard shortcuts/i)).not.toBeInTheDocument();
  });

  it("clamps the slot request to the host horizon and still loads times", async () => {
    let slotStartParam: string | null = null;
    let slotEndParam: string | null = null;
    const inWindowStart = new Date(
      Date.now() + 2 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const inWindowEnd = new Date(
      Date.parse(inWindowStart) + 30 * 60 * 1000,
    ).toISOString();

    server.use(
      rest.get(
        `${ENV_WEB.API_BASEURL}/booking/pages/tylerdane`,
        (_req, res, ctx) =>
          res(
            ctx.status(Status.OK),
            ctx.json(publicPagePayload({ maxHorizonDays: 7 })),
          ),
      ),
      rest.get(
        `${ENV_WEB.API_BASEURL}/booking/pages/tylerdane/slots`,
        (req, res, ctx) => {
          slotStartParam = req.url.searchParams.get("start");
          slotEndParam = req.url.searchParams.get("end");
          return res(
            ctx.status(Status.OK),
            ctx.json({
              bookable: true,
              slots: [{ slotStart: inWindowStart, slotEnd: inWindowEnd }],
            }),
          );
        },
      ),
    );

    renderBookingRoute("/book/tylerdane");

    expect(
      await screen.findByRole("heading", { name: "Book with Tyler Dane" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Could not load times" }),
    ).not.toBeInTheDocument();
    expect(slotStartParam).toBeTruthy();
    expect(slotEndParam).toBeTruthy();
    const requestedMs =
      Date.parse(slotEndParam ?? "") - Date.parse(slotStartParam ?? "");
    expect(requestedMs).toBeGreaterThan(0);
    expect(requestedMs).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000 + 60_000);
  });
});
