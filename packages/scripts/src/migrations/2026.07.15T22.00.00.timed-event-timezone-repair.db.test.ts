import { MigratorType } from "@scripts/common/cli.types";
import Migration from "@scripts/migrations/2026.07.15T22.00.00.timed-event-timezone-repair";
import { ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import mongoService from "@backend/common/services/mongo.service";
import { type EventRecord } from "@backend/event/event.record";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";

const buildCalendar = (
  overrides: Partial<CalendarRecord> = {},
): CalendarRecord => ({
  _id: new ObjectId(),
  userId: new ObjectId(),
  name: "Personal",
  description: "",
  timeZone: "America/Denver",
  foregroundColor: "#000000",
  backgroundColor: "#ffffff",
  access: "owner",
  isPrimary: true,
  isVisible: true,
  isActive: true,
  source: { provider: "local" },
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

const buildEvent = (
  calendarId: ObjectId,
  overrides: Partial<EventRecord> = {},
): EventRecord => ({
  _id: new ObjectId(),
  calendarId,
  content: { kind: "details", title: "lunch", description: "" },
  schedule: {
    kind: "timed",
    start: new Date("2026-07-14T15:00:00.000Z"),
    end: new Date("2026-07-14T16:00:00.000Z"),
    timeZone: "UTC",
  },
  recurrence: { kind: "single" },
  externalReference: null,
  createdAt: new Date("2026-07-10T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

describe("2026.07.15T22.00.00.timed-event-timezone-repair", () => {
  const migration = new Migration();

  const contextFor = (dryRun: boolean) => ({
    name: migration.name,
    context: {
      logger: Logger("test:migration"),
      migratorType: MigratorType.MIGRATION,
      unsafe: false,
      dryRun,
    },
  });

  beforeAll(() => setupTestDb(import.meta.url));
  afterEach(cleanupCollections);
  afterAll(cleanupTestDb);

  it("no-ops cleanly against a fresh, empty database", async () => {
    await expect(migration.up(contextFor(false))).resolves.toBeUndefined();
  });

  it("re-derives schedule.timeZone from the owning calendar for a UTC-tagged event", async () => {
    const calendar = buildCalendar({ timeZone: "America/Denver" });
    const event = buildEvent(calendar._id);
    await mongoService.calendar.insertOne(calendar);
    await mongoService.event.insertOne(event);

    await migration.up(contextFor(false));

    const updated = await mongoService.event.findOne({ _id: event._id });
    expect(updated?.schedule).toMatchObject({ timeZone: "America/Denver" });
  });

  it("never changes schedule.start/end, only timeZone", async () => {
    const calendar = buildCalendar({ timeZone: "Europe/Istanbul" });
    const event = buildEvent(calendar._id);
    await mongoService.calendar.insertOne(calendar);
    await mongoService.event.insertOne(event);

    await migration.up(contextFor(false));

    const updated = await mongoService.event.findOne({ _id: event._id });
    expect(updated?.schedule).toMatchObject({
      start: event.schedule.kind === "timed" ? event.schedule.start : null,
      end: event.schedule.kind === "timed" ? event.schedule.end : null,
    });
  });

  it("leaves events already tagged with a non-UTC timeZone untouched", async () => {
    const calendar = buildCalendar({ timeZone: "America/Denver" });
    const event = buildEvent(calendar._id, {
      schedule: {
        kind: "timed",
        start: new Date("2026-07-14T15:00:00.000Z"),
        end: new Date("2026-07-14T16:00:00.000Z"),
        timeZone: "America/Chicago",
      },
    });
    await mongoService.calendar.insertOne(calendar);
    await mongoService.event.insertOne(event);

    await migration.up(contextFor(false));

    const untouched = await mongoService.event.findOne({ _id: event._id });
    expect(untouched?.schedule).toMatchObject({ timeZone: "America/Chicago" });
  });

  it("skips (does not write) when the owning calendar cannot be found", async () => {
    const event = buildEvent(new ObjectId());
    await mongoService.event.insertOne(event);

    await migration.up(contextFor(false));

    const unchanged = await mongoService.event.findOne({ _id: event._id });
    expect(unchanged?.schedule).toMatchObject({ timeZone: "UTC" });
  });

  it("skips when the owning calendar's timeZone is null or also UTC", async () => {
    const nullTzCalendar = buildCalendar({ timeZone: null });
    const utcTzCalendar = buildCalendar({ timeZone: "UTC" });
    const eventUnderNullTz = buildEvent(nullTzCalendar._id);
    const eventUnderUtcTz = buildEvent(utcTzCalendar._id);
    await mongoService.calendar.insertMany([nullTzCalendar, utcTzCalendar]);
    await mongoService.event.insertMany([eventUnderNullTz, eventUnderUtcTz]);

    await migration.up(contextFor(false));

    const first = await mongoService.event.findOne({
      _id: eventUnderNullTz._id,
    });
    const second = await mongoService.event.findOne({
      _id: eventUnderUtcTz._id,
    });
    expect(first?.schedule).toMatchObject({ timeZone: "UTC" });
    expect(second?.schedule).toMatchObject({ timeZone: "UTC" });
  });

  it("dry-run reports without writing changes", async () => {
    const calendar = buildCalendar({ timeZone: "America/Los_Angeles" });
    const event = buildEvent(calendar._id);
    await mongoService.calendar.insertOne(calendar);
    await mongoService.event.insertOne(event);

    await migration.up(contextFor(true));

    const unchanged = await mongoService.event.findOne({ _id: event._id });
    expect(unchanged?.schedule).toMatchObject({ timeZone: "UTC" });
  });

  it("is safe to rerun: converges to zero further changes once fixed", async () => {
    const calendar = buildCalendar({ timeZone: "America/Denver" });
    const event = buildEvent(calendar._id);
    await mongoService.calendar.insertOne(calendar);
    await mongoService.event.insertOne(event);

    await migration.up(contextFor(false));
    await expect(migration.up(contextFor(false))).resolves.toBeUndefined();

    const updated = await mongoService.event.findOne({ _id: event._id });
    expect(updated?.schedule).toMatchObject({ timeZone: "America/Denver" });
  });
});
