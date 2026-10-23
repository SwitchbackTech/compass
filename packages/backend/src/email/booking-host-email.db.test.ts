import { ObjectId } from "mongodb";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { CONFIG } from "@backend/common/constants/config.constants";
import mongoService from "@backend/common/services/mongo.service";
import { enqueueBookingHostEmail } from "@backend/email/booking-host-email.enrollment";
import { buildBookingHostEmailLedgerId } from "@backend/email/booking-host-email.id";
import emailUnsubscribeController from "@backend/email/controllers/email.unsubscribe.controller";
import { ensureEmailIndexes } from "@backend/email/email-indexes";
import { createUnsubscribeToken } from "@backend/email/unsubscribe-token";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test";

describe("booking host email db", () => {
  const originalProvider = CONFIG.EMAIL_PROVIDER;
  const originalBookingHostEnabled = CONFIG.BOOKING_HOST_EMAIL_ENABLED;
  const originalUnsubSecret = CONFIG.EMAIL_UNSUBSCRIBE_SECRET;

  beforeAll(async () => {
    await setupTestDb(import.meta.url);
    await ensureEmailIndexes();
  });

  beforeEach(async () => {
    CONFIG.EMAIL_PROVIDER = "log";
    CONFIG.BOOKING_HOST_EMAIL_ENABLED = true;
    CONFIG.EMAIL_UNSUBSCRIBE_SECRET = "test-unsubscribe-secret";
    await cleanupCollections();
  });

  afterEach(() => {
    CONFIG.EMAIL_PROVIDER = originalProvider;
    CONFIG.BOOKING_HOST_EMAIL_ENABLED = originalBookingHostEnabled;
    CONFIG.EMAIL_UNSUBSCRIBE_SECRET = originalUnsubSecret;
  });

  afterAll(cleanupTestDb);

  it("enqueue is idempotent for the same guest action timestamp", async () => {
    const userId = new ObjectId();
    const pageId = new ObjectId();
    const reservationId = new ObjectId();
    const actionAt = new Date("2026-10-23T12:00:00.000Z");

    const reservation = {
      _id: reservationId,
      pageId,
      slotStart: new Date("2026-10-24T17:00:00.000Z"),
      slotEnd: new Date("2026-10-24T17:30:00.000Z"),
      guestName: "Alex",
      guestEmail: "alex@example.com",
      notes: null,
      guestTimeZone: "America/New_York",
      status: "confirmed" as const,
      calendarEventId: "evt-1",
      cancelTokenHash: "hash",
      lastGuestActionAt: actionAt,
      lastGuestAction: "booked" as const,
      createdAt: actionAt,
      updatedAt: actionAt,
    };

    const page = {
      _id: pageId,
      userId,
      enabled: true,
      durationMinutes: 30,
      timeZone: "America/Los_Angeles",
    } as never;

    await enqueueBookingHostEmail(page, reservation);
    await enqueueBookingHostEmail(page, reservation);

    const rows = await mongoService.emailSend
      .find({ sequence: "booking-host" })
      .toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]?._id).toBe(
      buildBookingHostEmailLedgerId({
        reservationId: reservationId.toHexString(),
        lastGuestActionAt: actionAt,
        kind: "booked",
      }),
    );
  });

  it("sets bookingHostEmailDisabledAt from scoped unsubscribe without welcome unsubscribedAt", async () => {
    const userId = new ObjectId();
    await mongoService.user.insertOne({
      _id: userId,
      email: "host@example.com",
      firstName: "Host",
      lastName: "Example",
      name: "Host Example",
      locale: "en",
    } as never);

    const token = createUnsubscribeToken(
      userId.toHexString(),
      CONFIG.EMAIL_UNSUBSCRIBE_SECRET!,
    );

    const req = {
      body: { token, scope: "booking-host" },
    } as never;
    const res = {
      status: mock(() => res),
      type: mock(() => res),
      send: mock(() => undefined),
    } as never;

    await emailUnsubscribeController.confirmUnsubscribe(req, res);

    const user = await mongoService.user.findOne({ _id: userId });
    expect(user?.emailPreferences?.bookingHostEmailDisabledAt).toBeInstanceOf(
      Date,
    );
    expect(user?.emailPreferences?.unsubscribedAt).toBeUndefined();
  });
});
