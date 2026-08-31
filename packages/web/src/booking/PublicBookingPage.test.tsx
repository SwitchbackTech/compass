import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { rest } from "msw";
import { Status } from "@core/errors/status.codes";
import { server } from "@web/__tests__/__mocks__/server/mock.server";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import {
  formatBookingMonthDayLabel,
  formatBookingMonthHeading,
  formatBookingSlotDateKey,
  formatBookingSlotLabel,
  shiftBookingMonthKey,
} from "@web/booking/public-booking.format";
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

function bookableSlotInCurrentMonth(minuteOffset = 0) {
  const now = new Date();
  const start = new Date(now);
  start.setUTCHours(15, minuteOffset, 0, 0);
  if (
    start.getTime() <= now.getTime() ||
    start.getUTCMonth() !== now.getUTCMonth()
  ) {
    start.setTime(now.getTime() + 2 * 60 * 60 * 1000);
    start.setUTCMinutes(minuteOffset, 0, 0);
  }
  return {
    slotStart: start.toISOString(),
    slotEnd: new Date(start.getTime() + 30 * 60 * 1000).toISOString(),
  };
}

function bookableSlotInNextMonth() {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 2, 16, 0, 0),
  );
  return {
    slotStart: start.toISOString(),
    slotEnd: new Date(start.getTime() + 30 * 60 * 1000).toISOString(),
  };
}

function slotTimePattern(iso: string) {
  const label = new Intl.DateTimeFormat(undefined, {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
  return new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

const currentSlot = bookableSlotInCurrentMonth();
const laterCurrentSlot = bookableSlotInCurrentMonth(30);
const nextMonthSlot = bookableSlotInNextMonth();
const guestTimeZone = "UTC";
const currentMonthKey = new Date().toISOString().slice(0, 7);

const publicPagePayload = (overrides: Record<string, unknown> = {}) => ({
  hostDisplayName: "Tyler Dane",
  durationMinutes: 30,
  timeZone: "America/Chicago",
  enabled: true,
  maxHorizonDays: 60,
  ...overrides,
});

function pageHandler() {
  return rest.get(
    `${ENV_WEB.API_BASEURL}/booking/pages/tylerdane`,
    (_req, res, ctx) =>
      res(ctx.status(Status.OK), ctx.json(publicPagePayload())),
  );
}

function slotsInWindow(
  allSlots: Array<{ slotStart: string; slotEnd: string }>,
  onRequest?: () => void,
) {
  return rest.get(
    `${ENV_WEB.API_BASEURL}/booking/pages/tylerdane/slots`,
    (req, res, ctx) => {
      onRequest?.();
      const start = req.url.searchParams.get("start");
      const end = req.url.searchParams.get("end");
      const startMs = start ? Date.parse(start) : Number.NEGATIVE_INFINITY;
      const endMs = end ? Date.parse(end) : Number.POSITIVE_INFINITY;
      const slots = allSlots.filter((slot) => {
        const at = Date.parse(slot.slotStart);
        return at >= startMs && at < endMs;
      });
      return res(ctx.status(Status.OK), ctx.json({ bookable: true, slots }));
    },
  );
}

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
      pageHandler(),
      slotsInWindow([currentSlot]),
      rest.post(
        `${ENV_WEB.API_BASEURL}/booking/pages/tylerdane/reservations`,
        async (req, res, ctx) => {
          postedBody = await req.json();
          return res(
            ctx.status(Status.OK),
            ctx.json({
              reservationId: "000000000000000000000099",
              slotStart: currentSlot.slotStart,
              slotEnd: currentSlot.slotEnd,
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
    expect(screen.getByRole("main").className).toContain("max-w-3xl");
    expect(
      await screen.findByText(/Times shown in your timezone/),
    ).toBeInTheDocument();

    const dateKey = formatBookingSlotDateKey(
      currentSlot.slotStart,
      guestTimeZone,
    );
    expect(
      await screen.findByRole("button", {
        name: formatBookingMonthDayLabel(dateKey, guestTimeZone),
      }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(
      await screen.findByRole("button", {
        name: slotTimePattern(currentSlot.slotStart),
      }),
    );
    const detailsHeading = screen.getByRole("heading", {
      name: "Your details",
    });
    await waitFor(() => {
      expect(detailsHeading).toHaveFocus();
    });
    expect(screen.getByText("When")).toBeInTheDocument();
    expect(
      screen.getByText(
        formatBookingSlotLabel(currentSlot.slotStart, guestTimeZone),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Duration")).toBeInTheDocument();
    expect(screen.getByText("Timezone")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Pick a time" }),
    ).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Name"), "Guest User");
    await user.type(screen.getByLabelText("Email"), "guest@example.com");
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));

    expect(
      await screen.findByRole("heading", {
        name: "You are booked with Tyler Dane",
      }),
    ).toBeInTheDocument();
    expect(postedBody).toMatchObject({
      slotStart: currentSlot.slotStart,
      guestName: "Guest User",
      guestEmail: "guest@example.com",
    });
  });

  it("shows unavailable when bookable is false", async () => {
    server.use(
      pageHandler(),
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

  it("keeps guest details and moves focus to the alert on 409", async () => {
    const user = userEvent.setup({ delay: null });
    let slotRequests = 0;

    server.use(
      pageHandler(),
      slotsInWindow([currentSlot, laterCurrentSlot], () => {
        slotRequests += 1;
      }),
      rest.post(
        `${ENV_WEB.API_BASEURL}/booking/pages/tylerdane/reservations`,
        (_req, res, ctx) => res(ctx.status(Status.CONFLICT), ctx.json({})),
      ),
    );

    renderBookingRoute("/book/tylerdane");

    await screen.findByRole("heading", { name: "Book with Tyler Dane" });
    await user.click(
      await screen.findByRole("button", {
        name: slotTimePattern(currentSlot.slotStart),
      }),
    );
    await user.type(screen.getByLabelText("Name"), "Guest User");
    await user.type(screen.getByLabelText("Email"), "guest@example.com");
    await user.type(screen.getByLabelText("Notes (optional)"), "Bring slides");
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "This time is no longer available. Pick another slot.",
    );
    await waitFor(() => {
      expect(alert).toHaveFocus();
    });
    expect(screen.getByLabelText("Name")).toHaveValue("Guest User");
    expect(screen.getByLabelText("Email")).toHaveValue("guest@example.com");
    expect(screen.getByLabelText("Notes (optional)")).toHaveValue(
      "Bring slides",
    );
    expect(
      screen.getByRole("button", { name: "Confirm booking" }),
    ).toBeDisabled();
    await waitFor(() => {
      expect(slotRequests).toBeGreaterThan(1);
    });
    expect(
      screen.getByRole("heading", { name: "Pick a time" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: slotTimePattern(laterCurrentSlot.slotStart),
      }),
    );
    expect(
      await screen.findByRole("heading", { name: "Your details" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirm booking" }),
    ).toBeEnabled();
    expect(screen.getByLabelText("Name")).toHaveValue("Guest User");
  });

  it("does not boot the calendar shortcut overlay on public booking routes", async () => {
    server.use(
      pageHandler(),
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

  it("starts page meta and the current-month slots request in parallel", async () => {
    const events: string[] = [];
    const delay = (ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      });

    server.use(
      rest.get(
        `${ENV_WEB.API_BASEURL}/booking/pages/tylerdane`,
        async (_req, res, ctx) => {
          events.push("page-start");
          await delay(80);
          events.push("page-end");
          return res(ctx.status(Status.OK), ctx.json(publicPagePayload()));
        },
      ),
      rest.get(
        `${ENV_WEB.API_BASEURL}/booking/pages/tylerdane/slots`,
        async (_req, res, ctx) => {
          events.push("slots-start");
          await delay(80);
          events.push("slots-end");
          return res(
            ctx.status(Status.OK),
            ctx.json({
              bookable: true,
              slots: [currentSlot],
            }),
          );
        },
      ),
    );

    renderBookingRoute("/book/tylerdane");

    await waitFor(() => {
      expect(events).toContain("page-start");
      expect(events).toContain("slots-start");
    });
    expect(events).not.toContain("page-end");
    expect(events).not.toContain("slots-end");

    expect(
      await screen.findByRole("heading", { name: "Book with Tyler Dane" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByText("Loading open times..."),
      ).not.toBeInTheDocument();
    });
  });

  it("renders a prefetched month without a new slots request", async () => {
    const user = userEvent.setup({ delay: null });
    let slotRequests = 0;

    server.use(
      pageHandler(),
      slotsInWindow([currentSlot, nextMonthSlot], () => {
        slotRequests += 1;
      }),
    );

    renderBookingRoute("/book/tylerdane");

    await screen.findByRole("heading", { name: "Book with Tyler Dane" });
    await waitFor(() => {
      expect(
        screen.queryByText("Loading open times..."),
      ).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(slotRequests).toBeGreaterThanOrEqual(2);
    });
    const requestsAfterPrefetch = slotRequests;

    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.queryByText("Loading open times...")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(slotRequests).toBeGreaterThanOrEqual(requestsAfterPrefetch);
    });
    const requestsAfterArrive = slotRequests;

    await user.click(screen.getByRole("button", { name: "Previous month" }));
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(slotRequests).toBe(requestsAfterArrive);
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
          if (slotStartParam == null) {
            slotStartParam = req.url.searchParams.get("start");
            slotEndParam = req.url.searchParams.get("end");
          }
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
    expect(requestedMs).toBeLessThanOrEqual(32 * 24 * 60 * 60 * 1000);
    const start = new Date(slotStartParam ?? "");
    expect(start.getUTCMinutes()).toBe(0);
    expect(start.getUTCSeconds()).toBe(0);
    expect(start.getUTCMilliseconds()).toBe(0);
  });

  it("scopes the slot list to the selected day and swaps it when the month changes", async () => {
    const user = userEvent.setup({ delay: null });
    server.use(pageHandler(), slotsInWindow([currentSlot, nextMonthSlot]));

    renderBookingRoute("/book/tylerdane");

    expect(
      await screen.findByRole("button", {
        name: slotTimePattern(currentSlot.slotStart),
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: slotTimePattern(nextMonthSlot.slotStart),
      }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next month" }));

    const nextMonthKey = shiftBookingMonthKey(
      currentMonthKey,
      1,
      guestTimeZone,
    );
    expect(
      await screen.findByRole("heading", {
        name: formatBookingMonthHeading(nextMonthKey, guestTimeZone),
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", {
        name: slotTimePattern(nextMonthSlot.slotStart),
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: slotTimePattern(currentSlot.slotStart),
      }),
    ).not.toBeInTheDocument();
  });

  it("jumps across a month boundary to the next open day", async () => {
    const user = userEvent.setup({ delay: null });
    server.use(pageHandler(), slotsInWindow([nextMonthSlot]));

    renderBookingRoute("/book/tylerdane");

    await screen.findByRole("heading", { name: "Book with Tyler Dane" });
    expect(
      await screen.findByText("No open times this month."),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Jump to next available day" }),
    );

    const nextMonthKey = shiftBookingMonthKey(
      currentMonthKey,
      1,
      guestTimeZone,
    );
    expect(
      await screen.findByRole("heading", {
        name: formatBookingMonthHeading(nextMonthKey, guestTimeZone),
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", {
        name: slotTimePattern(nextMonthSlot.slotStart),
      }),
    ).toBeInTheDocument();
    const nextDateKey = formatBookingSlotDateKey(
      nextMonthSlot.slotStart,
      guestTimeZone,
    );
    expect(
      screen.getByRole("button", {
        name: formatBookingMonthDayLabel(nextDateKey, guestTimeZone),
      }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("returns to the picker with the day and typed fields intact", async () => {
    const user = userEvent.setup({ delay: null });
    server.use(pageHandler(), slotsInWindow([currentSlot, laterCurrentSlot]));

    renderBookingRoute("/book/tylerdane");

    await user.click(
      await screen.findByRole("button", {
        name: slotTimePattern(currentSlot.slotStart),
      }),
    );
    await user.type(screen.getByLabelText("Name"), "Guest User");
    await user.type(screen.getByLabelText("Email"), "guest@example.com");
    await user.type(screen.getByLabelText("Notes (optional)"), "Bring slides");
    await user.click(screen.getByRole("button", { name: "Change time" }));

    expect(
      await screen.findByRole("heading", { name: "Pick a time" }),
    ).toBeInTheDocument();
    const dateKey = formatBookingSlotDateKey(
      currentSlot.slotStart,
      guestTimeZone,
    );
    expect(
      screen.getByRole("button", {
        name: formatBookingMonthDayLabel(dateKey, guestTimeZone),
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", {
        name: slotTimePattern(currentSlot.slotStart),
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: slotTimePattern(laterCurrentSlot.slotStart),
      }),
    );
    expect(screen.getByLabelText("Name")).toHaveValue("Guest User");
    expect(screen.getByLabelText("Email")).toHaveValue("guest@example.com");
    expect(screen.getByLabelText("Notes (optional)")).toHaveValue(
      "Bring slides",
    );
    expect(
      screen.getByText(
        formatBookingSlotLabel(laterCurrentSlot.slotStart, guestTimeZone),
      ),
    ).toBeInTheDocument();
  });

  it("shows an in-flight confirm label and posts only once", async () => {
    const user = userEvent.setup({ delay: null });
    let posts = 0;
    const delay = (ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      });

    server.use(
      pageHandler(),
      slotsInWindow([currentSlot]),
      rest.post(
        `${ENV_WEB.API_BASEURL}/booking/pages/tylerdane/reservations`,
        async (_req, res, ctx) => {
          posts += 1;
          await delay(80);
          return res(
            ctx.status(Status.OK),
            ctx.json({
              reservationId: "000000000000000000000099",
              slotStart: currentSlot.slotStart,
              slotEnd: currentSlot.slotEnd,
              guestTimeZone: "UTC",
              cancelUrl:
                "https://compasscalendar.com/book/cancel/000000000000000000000099?token=abc",
            }),
          );
        },
      ),
    );

    renderBookingRoute("/book/tylerdane");

    await user.click(
      await screen.findByRole("button", {
        name: slotTimePattern(currentSlot.slotStart),
      }),
    );
    await user.type(screen.getByLabelText("Name"), "Guest User");
    await user.type(screen.getByLabelText("Email"), "guest@example.com");
    const confirm = screen.getByRole("button", { name: "Confirm booking" });
    await user.click(confirm);
    const confirming = await screen.findByRole("button", {
      name: "Confirming...",
    });
    expect(confirming).toHaveAttribute("aria-busy", "true");
    expect(confirming).toBeDisabled();
    fireEvent.submit(confirming.closest("form") as HTMLFormElement);
    expect(posts).toBe(1);

    expect(
      await screen.findByRole("heading", {
        name: "You are booked with Tyler Dane",
      }),
    ).toBeInTheDocument();
    expect(posts).toBe(1);
  });
});
