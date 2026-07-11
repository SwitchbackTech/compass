import { ObjectId } from "mongodb";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { type EventRecord } from "@backend/event/event.record";
import compassToGoogleBackfill from "@backend/sync/services/event-propagation/compass-to-google/compass-to-google-backfill";

const buildGoogleCalendar = (
  userId: ObjectId,
  overrides: Partial<CalendarRecord> = {},
): CalendarRecord => ({
  _id: new ObjectId(),
  userId,
  name: "Primary",
  description: "",
  timeZone: "America/Denver",
  foregroundColor: "#000000",
  backgroundColor: "#ffffff",
  access: "owner",
  isPrimary: true,
  isVisible: true,
  isActive: true,
  source: { provider: "google", calendarId: "primary", etag: "etag-1" },
  createdAt: new Date(),
  updatedAt: null,
  ...overrides,
});

const buildEvent = (
  calendarId: ObjectId,
  overrides: Partial<EventRecord> = {},
): EventRecord => ({
  _id: new ObjectId(),
  calendarId,
  content: { kind: "details", title: "Compass event", description: "" },
  schedule: {
    kind: "timed",
    start: new Date("2026-01-15T10:00:00.000Z"),
    end: new Date("2026-01-15T11:00:00.000Z"),
    timeZone: "America/Denver",
  },
  recurrence: { kind: "single" },
  priority: "unassigned",
  externalReference: null,
  createdAt: new Date(),
  updatedAt: null,
  ...overrides,
});

describe("compassToGoogleBackfill", () => {
  beforeAll(initSupertokens);
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  it("creates a Google event for Compass-owned events without a provider reference", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();
    const calendar = buildGoogleCalendar(user._id);
    await mongoService.calendar.insertOne(calendar);
    const event = buildEvent(calendar._id);
    await mongoService.event.insertOne(event);

    jest.spyOn(gcalService, "createEvent").mockResolvedValue({
      id: "google-event-id",
    } as never);

    await expect(
      compassToGoogleBackfill.syncCompassEventsToGoogle(userId),
    ).resolves.toBe(1);

    const stored = await mongoService.event.findOne({ _id: event._id });
    expect(stored?.externalReference).toEqual(
      expect.objectContaining({
        provider: "google",
        eventId: "google-event-id",
      }),
    );
  });

  it("ignores someday events, occurrences, and events that already have a provider reference", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();
    const calendar = buildGoogleCalendar(user._id);
    await mongoService.calendar.insertOne(calendar);
    const seriesId = new ObjectId();

    await mongoService.event.insertMany([
      buildEvent(calendar._id, {
        schedule: {
          kind: "someday",
          period: "week",
          anchorDate: "2026-01-12",
          sortOrder: 0,
        },
      }),
      buildEvent(calendar._id, {
        externalReference: {
          provider: "google",
          eventId: "existing-google-id",
          recurringEventId: null,
        },
      }),
      buildEvent(calendar._id, {
        recurrence: { kind: "occurrence", seriesId },
      }),
    ]);

    const createSpy = jest.spyOn(gcalService, "createEvent");

    await expect(
      compassToGoogleBackfill.syncCompassEventsToGoogle(userId),
    ).resolves.toBe(0);

    expect(createSpy).not.toHaveBeenCalled();
  });

  it("ignores events owned by a local calendar", async () => {
    const user = await UserDriver.createUser();
    const userId = user._id.toString();
    const localCalendar = buildGoogleCalendar(user._id, {
      source: { provider: "local" },
      isPrimary: false,
    });
    await mongoService.calendar.insertOne(localCalendar);
    await mongoService.event.insertOne(buildEvent(localCalendar._id));

    const createSpy = jest.spyOn(gcalService, "createEvent");

    await expect(
      compassToGoogleBackfill.syncCompassEventsToGoogle(userId),
    ).resolves.toBe(0);

    expect(createSpy).not.toHaveBeenCalled();
  });
});
