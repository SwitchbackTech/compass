import { ObjectId } from "mongodb";
import { Status } from "@core/errors/status.codes";
import { AdminPutBookingPageInputSchema } from "@core/types/booking.contracts";
import { BaseDriver } from "@backend/__tests__/drivers/base.driver";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import * as billingGuard from "@backend/billing/billing.guard";
import { ensureBookingIndexes } from "@backend/booking/booking-indexes";
import { bookingReservationRepository } from "@backend/booking/booking-reservation.repository";
import bookingPageService from "@backend/booking/services/booking-page.service";
import { type CalendarBookingPort } from "@backend/booking/services/calendar-booking.port";
import { PublicBookingService } from "@backend/booking/services/public-booking.service";
import * as syncServiceFactory from "@backend/common/services/sync-service/sync-service.factory";
import userService from "@backend/user/services/user.service";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const calendarId = () => new ObjectId().toString();

const writableCalendar = (id = calendarId()) => ({
  id,
  tenantId: new ObjectId().toString(),
  principalId: new ObjectId().toString(),
  connectionId: new ObjectId().toString(),
  providerCalendarId: "primary",
  displayName: "Work",
  color: "#9fe1e7",
  active: true,
  primary: true,
  accessRole: "owner" as const,
  capabilities: {
    canReadEvents: true,
    canWriteEvents: true,
    canReadBusy: true,
    canInviteAttendees: true,
  },
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-20T12:00:00.000Z",
});

const healthyConnection = () => ({
  id: new ObjectId().toString(),
  tenantId: new ObjectId().toString(),
  principalId: new ObjectId().toString(),
  provider: "google" as const,
  account: {
    providerAccountId: "112233445566778899000",
    email: "user@gmail.com",
    displayName: "Test User",
  },
  capabilities: ["readEvents", "writeEvents"] as const,
  state: "healthy" as const,
  stateReason: null,
  lastSyncedAt: "2026-07-20T12:00:00.000Z",
  lastHealthyAt: "2026-07-20T12:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-20T12:00:00.000Z",
});

const samplePutInput = (overrides: Record<string, unknown> = {}) => {
  const destination = calendarId();
  return AdminPutBookingPageInputSchema.parse({
    enabled: true,
    durationMinutes: 30,
    destinationCalendarId: destination,
    blockingCalendarIds: [destination],
    timeZone: "UTC",
    weeklyAvailability: [{ weekday: 1, start: "09:00", end: "17:00" }],
    minNoticeHours: 0,
    maxHorizonDays: 60,
    bufferMinutes: null,
    maxBookingsPerDay: null,
    guestsCanInviteOthers: true,
    ...overrides,
  });
};

const createNamedUser = async (name: string) => {
  const created = await userService.createUser(
    UserDriver.generateGoogleUser({ name }),
  );
  return new ObjectId(created.userId);
};

const busyResponse = (bookable = true) => ({
  intervals: [],
  computedAt: "2026-09-07T12:00:00.000Z",
  connections: [],
  complete: true,
  issues: [],
  bookable,
});

describe("PublicBookingService", () => {
  let syncSpies: Array<{ mockRestore: () => void }> = [];
  let createBookingEvent: ReturnType<typeof mock>;
  let deleteBookingEvent: ReturnType<typeof mock>;
  let getAvailability: ReturnType<typeof mock>;
  let service: PublicBookingService;

  beforeAll(async () => {
    await setupTestDb(import.meta.url);
    await ensureBookingIndexes();
  });

  beforeEach(async () => {
    await cleanupCollections();
    syncSpies.forEach((spy) => spy.mockRestore());
    syncSpies = [];

    createBookingEvent = mock(async () => new ObjectId().toString());
    deleteBookingEvent = mock(async () => undefined);
    getAvailability = mock(async () => busyResponse(true));

    const port: CalendarBookingPort = {
      getAvailability,
      createBookingEvent,
      deleteBookingEvent,
    };
    service = new PublicBookingService(port);
  });

  afterAll(cleanupTestDb);

  const mockHealthySync = (
    calendars: ReturnType<typeof writableCalendar>[],
  ) => {
    syncSpies.push(
      spyOn(syncServiceFactory, "getSyncServiceClient").mockReturnValue({
        listConnections: mock(() =>
          Promise.resolve({
            ok: true as const,
            value: { connections: [healthyConnection()] },
          }),
        ),
        listCalendars: mock(() =>
          Promise.resolve({
            ok: true as const,
            value: { calendars },
          }),
        ),
      } as never),
    );
  };

  const enableBookingPage = async (slugName = "Host User") => {
    const userId = await createNamedUser(slugName);
    const calendar = writableCalendar();
    mockHealthySync([calendar]);
    spyOn(billingGuard, "assertBillingAllowsWrites").mockResolvedValue(
      undefined,
    );
    const page = await bookingPageService.putAdminPage(
      userId,
      samplePutInput({
        destinationCalendarId: calendar.id,
        blockingCalendarIds: [calendar.id],
      }),
    );
    const slug = "slug" in page ? page.slug : "";
    return { userId, slug, calendarId: calendar.id };
  };

  it("returns 404-equivalent for disabled slug via PAGE_NOT_FOUND", async () => {
    const userId = await createNamedUser("Disabled Host");
    const calendar = writableCalendar();
    mockHealthySync([calendar]);
    spyOn(billingGuard, "assertBillingAllowsWrites").mockResolvedValue(
      undefined,
    );
    const page = await bookingPageService.putAdminPage(
      userId,
      samplePutInput({
        enabled: false,
        destinationCalendarId: calendar.id,
        blockingCalendarIds: [calendar.id],
      }),
    );
    expect("slug" in page).toBe(false);

    await expect(service.getPublicPage("missingpage")).rejects.toMatchObject({
      bookingCode: "PAGE_NOT_FOUND",
    });
  });

  it("confirms a reservation and calls createBookingEvent once", async () => {
    const { slug } = await enableBookingPage();
    const slotStart = "2026-09-07T10:00:00.000Z";

    const response = await service.createReservation(slug, {
      slotStart,
      guestName: "Ada Lovelace",
      guestEmail: "ada@example.com",
      guestTimeZone: "Europe/London",
    });

    expect(createBookingEvent).toHaveBeenCalledTimes(1);
    expect(createBookingEvent.mock.calls[0]?.[1]).toMatchObject({
      guest: { email: "ada@example.com", displayName: "Ada Lovelace" },
      guestsCanInviteOthers: true,
    });
    expect(response.reservationId).toBeTruthy();
    expect(response.cancelUrl).toContain("token=");
  });

  it("rejects confirm when bookable is false without creating an event", async () => {
    const { slug } = await enableBookingPage();
    getAvailability.mockImplementation(async () => busyResponse(false));

    await expect(
      service.createReservation(slug, {
        slotStart: "2026-09-07T10:00:00.000Z",
        guestName: "Ada Lovelace",
        guestEmail: "ada@example.com",
        guestTimeZone: "Europe/London",
      }),
    ).rejects.toMatchObject({ bookingCode: "SLOT_UNAVAILABLE" });

    expect(createBookingEvent).not.toHaveBeenCalled();
  });

  it("rejects slot not in engine output", async () => {
    const { slug } = await enableBookingPage();
    getAvailability.mockImplementation(async () => ({
      ...busyResponse(true),
      intervals: [
        {
          start: "2026-09-07T10:00:00.000Z",
          end: "2026-09-07T11:00:00.000Z",
        },
      ],
    }));

    await expect(
      service.createReservation(slug, {
        slotStart: "2026-09-07T10:00:00.000Z",
        guestName: "Ada Lovelace",
        guestEmail: "ada@example.com",
        guestTimeZone: "Europe/London",
      }),
    ).rejects.toMatchObject({ bookingCode: "SLOT_UNAVAILABLE" });

    expect(createBookingEvent).not.toHaveBeenCalled();
  });

  it("returns empty slots with bookable false without leaking busy payloads", async () => {
    const { slug } = await enableBookingPage();
    getAvailability.mockImplementation(async () => ({
      ...busyResponse(false),
      intervals: [
        {
          start: "2026-09-07T10:00:00.000Z",
          end: "2026-09-07T11:00:00.000Z",
        },
      ],
    }));

    const response = await service.getSlots(slug, {
      start: "2026-09-07T00:00:00.000Z",
      end: "2026-09-08T00:00:00.000Z",
      timeZone: "UTC",
    });

    expect(response).toEqual({ slots: [], bookable: false });
    expect(JSON.stringify(response)).not.toContain("intervals");
  });

  it("clamps a requested window that extends past the host horizon", async () => {
    const userId = await createNamedUser("Short Horizon Host");
    const calendar = writableCalendar();
    mockHealthySync([calendar]);
    spyOn(billingGuard, "assertBillingAllowsWrites").mockResolvedValue(
      undefined,
    );
    const page = await bookingPageService.putAdminPage(
      userId,
      samplePutInput({
        destinationCalendarId: calendar.id,
        blockingCalendarIds: [calendar.id],
        maxHorizonDays: 7,
      }),
    );
    const slug = "slug" in page ? page.slug : "";
    const start = new Date();
    const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);

    const response = await service.getSlots(slug, {
      start: start.toISOString(),
      end: end.toISOString(),
      timeZone: "UTC",
    });

    expect(response.bookable).toBe(true);
    const horizonMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
    for (const slot of response.slots) {
      expect(Date.parse(slot.slotStart)).toBeLessThan(horizonMs + 1000);
    }
    const availabilityQuery = getAvailability.mock.calls[0]?.[1] as {
      end: string;
    };
    expect(Date.parse(availabilityQuery.end)).toBeLessThanOrEqual(
      horizonMs + 2000,
    );
  });

  it("accepts a month-length slot window within the existing 60-day cap", async () => {
    const { slug } = await enableBookingPage();
    const response = await service.getSlots(slug, {
      start: "2026-08-01T00:00:00.000Z",
      end: "2026-09-01T00:00:00.000Z",
      timeZone: "UTC",
    });

    expect(response.bookable).toBe(true);
    expect(Array.isArray(response.slots)).toBe(true);
  });

  it("still rejects a slot window whose end is not after start", async () => {
    const { slug } = await enableBookingPage();

    await expect(
      service.getSlots(slug, {
        start: "2026-09-08T00:00:00.000Z",
        end: "2026-09-07T00:00:00.000Z",
        timeZone: "UTC",
      }),
    ).rejects.toMatchObject({ bookingCode: "INVALID_INPUT" });
  });

  it("cancels idempotently", async () => {
    const { slug } = await enableBookingPage();
    const slotStart = "2026-09-07T10:00:00.000Z";
    const created = await service.createReservation(slug, {
      slotStart,
      guestName: "Ada Lovelace",
      guestEmail: "ada@example.com",
      guestTimeZone: "Europe/London",
    });

    const token = new URL(created.cancelUrl).searchParams.get("token");
    expect(token).toBeTruthy();

    const reservationId = new ObjectId(created.reservationId);
    await service.cancelReservation(reservationId, { token });
    await service.cancelReservation(reservationId, { token });

    expect(deleteBookingEvent).toHaveBeenCalledTimes(1);
    const stored = await bookingReservationRepository.findById(reservationId);
    expect(stored?.status).toBe("cancelled");
  });

  it("returns minimal public reservation details", async () => {
    const { slug } = await enableBookingPage();
    const created = await service.createReservation(slug, {
      slotStart: "2026-09-07T10:00:00.000Z",
      guestName: "Ada Lovelace",
      guestEmail: "ada@example.com",
      notes: "secret notes",
      guestTimeZone: "Europe/London",
    });

    const publicReservation = await service.getPublicReservation(
      new ObjectId(created.reservationId),
    );

    expect(publicReservation).toEqual({
      slotStart: created.slotStart,
      guestTimeZone: "Europe/London",
      durationMinutes: 30,
      hostDisplayName: "Host User",
      status: "confirmed",
    });
    expect(publicReservation).not.toHaveProperty("guestEmail");
    expect(publicReservation).not.toHaveProperty("cancelUrl");
    expect(publicReservation).not.toHaveProperty("notes");
  });

  it("returns the booked slot duration after the host changes page duration", async () => {
    const { slug, userId, calendarId } = await enableBookingPage();
    const created = await service.createReservation(slug, {
      slotStart: "2026-09-07T10:00:00.000Z",
      guestName: "Ada Lovelace",
      guestEmail: "ada@example.com",
      notes: "secret notes",
      guestTimeZone: "Europe/London",
    });

    spyOn(billingGuard, "assertBillingAllowsWrites").mockResolvedValue(
      undefined,
    );
    await bookingPageService.putAdminPage(
      userId,
      samplePutInput({
        destinationCalendarId: calendarId,
        blockingCalendarIds: [calendarId],
        durationMinutes: 45,
      }),
    );

    const publicReservation = await service.getPublicReservation(
      new ObjectId(created.reservationId),
    );
    expect(publicReservation.durationMinutes).toBe(30);
  });

  it("returns cancelled status without leaking guest contact", async () => {
    const { slug } = await enableBookingPage();
    const created = await service.createReservation(slug, {
      slotStart: "2026-09-07T10:00:00.000Z",
      guestName: "Ada Lovelace",
      guestEmail: "ada@example.com",
      guestTimeZone: "Europe/London",
    });
    const token = new URL(created.cancelUrl).searchParams.get("token");
    await service.cancelReservation(new ObjectId(created.reservationId), {
      token,
    });

    const publicReservation = await service.getPublicReservation(
      new ObjectId(created.reservationId),
    );
    expect(publicReservation.status).toBe("cancelled");
    expect(publicReservation).not.toHaveProperty("guestEmail");
  });

  it("throws not found for an unknown reservation", async () => {
    await expect(
      service.getPublicReservation(new ObjectId()),
    ).rejects.toMatchObject({ bookingCode: "RESERVATION_NOT_FOUND" });
  });

  it("rejects invalid guest email", async () => {
    const { slug } = await enableBookingPage();
    await expect(
      service.createReservation(slug, {
        slotStart: "2026-09-07T10:00:00.000Z",
        guestName: "Ada Lovelace",
        guestEmail: "not-an-email",
        guestTimeZone: "Europe/London",
      }),
    ).rejects.toMatchObject({ bookingCode: "INVALID_INPUT" });
  });
});

describe("Public booking routes", () => {
  const baseDriver = new BaseDriver();
  let syncSpies: Array<{ mockRestore: () => void }> = [];

  beforeAll(async () => {
    await setupTestDb(import.meta.url);
    await ensureBookingIndexes();
    await baseDriver.listen();
  });

  beforeEach(async () => {
    await cleanupCollections();
    syncSpies.forEach((spy) => spy.mockRestore());
    syncSpies = [];
  });

  afterAll(async () => {
    await baseDriver.teardown();
    await cleanupTestDb();
  });

  const mockHealthySync = (
    calendars: ReturnType<typeof writableCalendar>[],
    availability = busyResponse(true),
  ) => {
    syncSpies.push(
      spyOn(syncServiceFactory, "getSyncServiceClient").mockReturnValue({
        listConnections: mock(() =>
          Promise.resolve({
            ok: true as const,
            value: { connections: [healthyConnection()] },
          }),
        ),
        listCalendars: mock(() =>
          Promise.resolve({
            ok: true as const,
            value: { calendars },
          }),
        ),
        queryBusyAvailability: mock(async () => ({
          ok: true as const,
          value: availability,
        })),
        submitCommand: mock(async () => ({
          ok: true as const,
          value: { commandId: new ObjectId().toString() },
        })),
      } as never),
    );
  };

  it("GET public page returns host info for enabled slug", async () => {
    const userId = await createNamedUser("Public Host");
    const calendar = writableCalendar();
    mockHealthySync([calendar]);
    spyOn(billingGuard, "assertBillingAllowsWrites").mockResolvedValue(
      undefined,
    );
    const page = await bookingPageService.putAdminPage(
      userId,
      samplePutInput({
        destinationCalendarId: calendar.id,
        blockingCalendarIds: [calendar.id],
      }),
    );
    const slug = "slug" in page ? page.slug : "";

    const response = await baseDriver
      .getServer()
      .get(`/api/booking/pages/${slug}`)
      .expect(Status.OK);

    expect(response.body).toEqual(
      expect.objectContaining({
        hostDisplayName: "Public Host",
        durationMinutes: 30,
        enabled: true,
        maxHorizonDays: 60,
      }),
    );
  });

  it("GET public page returns 404 for missing slug", async () => {
    await baseDriver
      .getServer()
      .get("/api/booking/pages/notfound999")
      .expect(Status.NOT_FOUND);
  });

  it("GET public reservation returns 404 for an invalid id", async () => {
    await baseDriver
      .getServer()
      .get("/api/booking/reservations/not-an-id")
      .expect(Status.NOT_FOUND);
  });

  it("GET public reservation returns minimal fields", async () => {
    const userId = await createNamedUser("Permalink Host");
    const calendar = writableCalendar();
    mockHealthySync([calendar]);
    spyOn(billingGuard, "assertBillingAllowsWrites").mockResolvedValue(
      undefined,
    );
    const page = await bookingPageService.putAdminPage(
      userId,
      samplePutInput({
        destinationCalendarId: calendar.id,
        blockingCalendarIds: [calendar.id],
      }),
    );
    if (!("id" in page)) {
      throw new Error("expected a saved booking page");
    }
    const reservationId = new ObjectId();
    await bookingReservationRepository.insert({
      _id: reservationId,
      pageId: new ObjectId(page.id),
      slotStart: new Date("2026-09-07T10:00:00.000Z"),
      slotEnd: new Date("2026-09-07T10:30:00.000Z"),
      guestName: "Ada Lovelace",
      guestEmail: "ada@example.com",
      notes: "secret notes",
      guestTimeZone: "Europe/London",
      status: "confirmed",
      calendarEventId: "evt-1",
      cancelTokenHash: "a".repeat(64),
    });

    const response = await baseDriver
      .getServer()
      .get(`/api/booking/reservations/${reservationId.toString()}`)
      .expect(Status.OK);

    expect(response.body).toEqual({
      slotStart: "2026-09-07T10:00:00.000Z",
      guestTimeZone: "Europe/London",
      durationMinutes: 30,
      hostDisplayName: "Permalink Host",
      status: "confirmed",
    });
    expect(response.body).not.toHaveProperty("guestEmail");
    expect(response.body).not.toHaveProperty("cancelUrl");
    expect(response.body).not.toHaveProperty("notes");
  });

  it("POST reservation returns 409 when bookable is false", async () => {
    const userId = await createNamedUser("Unavailable Host");
    const calendar = writableCalendar();
    mockHealthySync([calendar], busyResponse(false));
    spyOn(billingGuard, "assertBillingAllowsWrites").mockResolvedValue(
      undefined,
    );
    const page = await bookingPageService.putAdminPage(
      userId,
      samplePutInput({
        destinationCalendarId: calendar.id,
        blockingCalendarIds: [calendar.id],
      }),
    );
    const slug = "slug" in page ? page.slug : "";

    await baseDriver
      .getServer()
      .post(`/api/booking/pages/${slug}/reservations`)
      .send({
        slotStart: "2026-09-07T10:00:00.000Z",
        guestName: "Ada Lovelace",
        guestEmail: "ada@example.com",
        guestTimeZone: "Europe/London",
      })
      .expect(Status.CONFLICT);
  });
});

describe("booking cancel token", () => {
  it("hashes and verifies with constant-time compare", async () => {
    const { generateCancelToken, hashCancelToken, verifyCancelToken } =
      await import("@backend/booking/booking-cancel-token");
    const token = generateCancelToken();
    const hash = hashCancelToken(token);
    expect(verifyCancelToken(hash, token)).toBe(true);
    expect(verifyCancelToken(hash, `${token}x`)).toBe(false);
    expect(hash).toHaveLength(64);
    expect(
      timingSafeEqual(
        Buffer.from(hash),
        Buffer.from(createHash("sha256").update(token, "utf8").digest("hex")),
      ),
    ).toBe(true);
    expect(randomBytes(32).length).toBe(32);
  });
});
