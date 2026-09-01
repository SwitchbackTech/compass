import { ObjectId } from "mongodb";
import { Status } from "@core/errors/status.codes";
import { AdminPutBookingPageInputSchema } from "@core/types/booking.contracts";
import { BaseDriver } from "@backend/__tests__/drivers/base.driver";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import * as billingGuard from "@backend/billing/billing.guard";
import { ensureBookingIndexes } from "@backend/booking/booking-indexes";
import { bookingPageRepository } from "@backend/booking/booking-page.repository";
import bookingPageService from "@backend/booking/services/booking-page.service";
import * as syncServiceFactory from "@backend/common/services/sync-service/sync-service.factory";
import { eventMutationError } from "@backend/event/event.error";
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
    timeZone: "America/Denver",
    weeklyAvailability: [{ weekday: 1, start: "09:00", end: "17:00" }],
    minNoticeHours: 4,
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

describe("BookingPageService", () => {
  let syncSpies: Array<{ mockRestore: () => void }> = [];

  beforeAll(async () => {
    await setupTestDb(import.meta.url);
    await ensureBookingIndexes();
  });
  beforeEach(async () => {
    await cleanupCollections();
    syncSpies.forEach((spy) => spy.mockRestore());
    syncSpies = [];
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

  it("returns defaults on GET before any PUT without inserting a row", async () => {
    const { user } = await UtilDriver.setupTestUser();

    const page = await bookingPageService.getAdminPage(user._id);

    expect(page).toEqual(
      expect.objectContaining({
        enabled: false,
        durationMinutes: 30,
        weeklyAvailability: [],
        // Nothing saved, so the timeZone is a placeholder the client replaces.
        isConfigured: false,
      }),
    );
    expect(await bookingPageRepository.findByUserId(user._id)).toBeNull();
  });

  it("reports a saved-but-never-enabled page as configured", async () => {
    const userId = await createNamedUser("Draft User");

    // Saved while disabled, so no slug is allocated and the response is the
    // bare input shape - indistinguishable from "never saved" without the
    // flag. The stored timezone here is a real choice the client must keep.
    await bookingPageService.putAdminPage(
      userId,
      samplePutInput({ enabled: false }),
    );

    const page = await bookingPageService.getAdminPage(userId);

    expect("bookingUrl" in page).toBe(false);
    expect(page).toEqual(
      expect.objectContaining({
        isConfigured: true,
        timeZone: "America/Denver",
      }),
    );
  });

  it("marks a disabled PUT response as configured too", async () => {
    const userId = await createNamedUser("Disabled Saver");

    // The PUT answer for a page with no slug is the same bare shape as GET's,
    // so it needs the flag as well - the client parses both with one schema.
    const saved = await bookingPageService.putAdminPage(
      userId,
      samplePutInput({ enabled: false }),
    );

    expect("bookingUrl" in saved).toBe(false);
    expect(saved).toEqual(expect.objectContaining({ isConfigured: true }));
  });

  it("allocates a slug once and keeps it on later PUTs", async () => {
    const userId = await createNamedUser("Guard User");
    const calendar = writableCalendar();
    mockHealthySync([calendar]);
    const input = samplePutInput({
      destinationCalendarId: calendar.id,
      blockingCalendarIds: [calendar.id],
    });

    const enabled = await bookingPageService.putAdminPage(userId, input);
    expect("slug" in enabled && enabled.slug).toBe("guarduser");

    const updated = await bookingPageService.putAdminPage(userId, {
      ...input,
      durationMinutes: 45,
    });

    expect("slug" in updated && updated.slug).toBe("guarduser");
    expect("durationMinutes" in updated && updated.durationMinutes).toBe(45);
  });

  it("persists date overrides and welcome text", async () => {
    const userId = await createNamedUser("Override Host");
    const calendar = writableCalendar();
    mockHealthySync([calendar]);
    const input = samplePutInput({
      destinationCalendarId: calendar.id,
      blockingCalendarIds: [calendar.id],
      dateOverrides: [
        { kind: "blocked", date: "2026-09-07" },
        {
          kind: "hours",
          date: "2026-09-12",
          intervals: [{ start: "09:00", end: "12:00" }],
        },
      ],
      welcomeText: "30 minutes to talk through Compass Calendar.",
    });

    await bookingPageService.putAdminPage(userId, input);
    const page = await bookingPageService.getAdminPage(userId);

    expect(page).toEqual(
      expect.objectContaining({
        dateOverrides: [
          { kind: "blocked", date: "2026-09-07" },
          {
            kind: "hours",
            date: "2026-09-12",
            intervals: [{ start: "09:00", end: "12:00" }],
          },
        ],
        welcomeText: "30 minutes to talk through Compass Calendar.",
      }),
    );
  });

  it("suffixes reserved slug collisions", async () => {
    const firstUserId = await createNamedUser("Week");
    const secondUserId = await createNamedUser("Week");

    const calendar = writableCalendar();
    mockHealthySync([calendar]);
    const input = samplePutInput({
      destinationCalendarId: calendar.id,
      blockingCalendarIds: [calendar.id],
    });

    const firstPage = await bookingPageService.putAdminPage(firstUserId, input);
    expect("slug" in firstPage && firstPage.slug).toBe("week2");

    const secondPage = await bookingPageService.putAdminPage(
      secondUserId,
      input,
    );
    expect("slug" in secondPage && secondPage.slug).toBe("week3");
  });

  it("rejects enable without a healthy Google connection", async () => {
    const { user } = await UtilDriver.setupTestUser();
    syncSpies.push(
      spyOn(syncServiceFactory, "getSyncServiceClient").mockReturnValue({
        listConnections: mock(() =>
          Promise.resolve({
            ok: true as const,
            value: { connections: [] },
          }),
        ),
        listCalendars: mock(() =>
          Promise.resolve({ ok: true as const, value: { calendars: [] } }),
        ),
      } as never),
    );

    await expect(
      bookingPageService.putAdminPage(user._id, samplePutInput()),
    ).rejects.toMatchObject({
      bookingCode: "GOOGLE_NOT_CONNECTED",
    });
  });

  it("rejects enable when billing forbids writes", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = writableCalendar();
    mockHealthySync([calendar]);
    syncSpies.push(
      spyOn(billingGuard, "assertBillingAllowsWrites").mockRejectedValue(
        eventMutationError(
          "BILLING_REQUIRED",
          "A paid subscription is required to make changes",
        ),
      ),
    );

    await expect(
      bookingPageService.putAdminPage(
        user._id,
        samplePutInput({
          destinationCalendarId: calendar.id,
          blockingCalendarIds: [calendar.id],
        }),
      ),
    ).rejects.toMatchObject({ code: "BILLING_REQUIRED" });
  });

  it("rejects enable when destination calendar is not writable", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const readOnly = writableCalendar();
    readOnly.capabilities.canWriteEvents = false;
    mockHealthySync([readOnly]);

    await expect(
      bookingPageService.putAdminPage(
        user._id,
        samplePutInput({
          destinationCalendarId: readOnly.id,
          blockingCalendarIds: [readOnly.id],
        }),
      ),
    ).rejects.toMatchObject({
      bookingCode: "DESTINATION_NOT_WRITABLE",
    });
  });
});

describe("BookingController", () => {
  const baseDriver = new BaseDriver();

  beforeAll(async () => {
    await setupTestDb(import.meta.url);
    await ensureBookingIndexes();
    await baseDriver.listen();
  });
  beforeEach(cleanupCollections);
  afterAll(async () => {
    await baseDriver.teardown();
    await cleanupTestDb();
  });

  it("GET /api/booking/page returns defaults without a session row", async () => {
    const { user } = await UtilDriver.setupTestUser();

    const response = await baseDriver
      .getServer()
      .get("/api/booking/page")
      .set(
        "Cookie",
        `session=${JSON.stringify({ userId: user._id.toString() })}`,
      )
      .expect(Status.OK);

    expect(response.body).toEqual(
      expect.objectContaining({ enabled: false, durationMinutes: 30 }),
    );
  });
});
