import { ObjectId, type WithId } from "mongodb";
import { type Schema_User } from "@core/types/user.types";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  type CalendarRecord,
  CalendarRecordSchema,
} from "@backend/calendar/calendar.record";
import mongoService from "@backend/common/services/mongo.service";
import { type EventRecord } from "@backend/event/event.record";

/**
 * Test conventions shared by the compass->google propagation suites (see
 * event.repository.test.ts / event.service.test.ts for the sibling
 * conventions this mirrors): real mongo-memory-server, EventRecord/
 * CalendarRecord shapes seeded directly, no ORM. Google network calls never
 * happen — @googleapis/calendar is globally replaced by the in-memory
 * mockGcal factory (packages/backend/src/__tests__/backend.test.start.ts),
 * so gcalService methods are safe to spy on without leaking a real request.
 */

export type GoogleCalendarRecord = CalendarRecord & {
  source: { provider: "google"; calendarId: string; etag: string };
};

export const seedGoogleCalendar = async (
  userId: ObjectId,
  overrides: Partial<CalendarRecord> = {},
): Promise<GoogleCalendarRecord> => {
  const record = CalendarRecordSchema.parse({
    _id: new ObjectId(),
    userId,
    name: "Work",
    description: "",
    timeZone: "America/Denver",
    foregroundColor: "#000000",
    backgroundColor: "#ffffff",
    access: "owner",
    isPrimary: true,
    isVisible: true,
    isActive: true,
    source: {
      provider: "google",
      calendarId: `gcal-${new ObjectId().toHexString()}`,
      etag: "etag-1",
    },
    createdAt: new Date(),
    updatedAt: null,
    ...overrides,
  }) as GoogleCalendarRecord;
  await mongoService.calendar.insertOne(record);
  return record;
};

export const seedLocalCalendar = async (
  userId: ObjectId,
  overrides: Partial<CalendarRecord> = {},
): Promise<CalendarRecord> => {
  const record = CalendarRecordSchema.parse({
    _id: new ObjectId(),
    userId,
    name: "Compass",
    description: "",
    timeZone: null,
    foregroundColor: "#000000",
    backgroundColor: "#ffffff",
    access: "owner",
    isPrimary: false,
    isVisible: true,
    isActive: true,
    source: { provider: "local" },
    createdAt: new Date(),
    updatedAt: null,
    ...overrides,
  });
  await mongoService.calendar.insertOne(record);
  return record;
};

export const buildEventRecord = (
  calendarId: ObjectId,
  overrides: Partial<EventRecord> = {},
): EventRecord => ({
  _id: new ObjectId(),
  calendarId,
  content: { kind: "details", title: "Standup", description: "" },
  schedule: {
    kind: "timed",
    start: new Date("2026-07-14T15:00:00.000Z"),
    end: new Date("2026-07-14T16:00:00.000Z"),
    timeZone: "America/Denver",
  },
  recurrence: { kind: "single" },
  priority: "unassigned",
  externalReference: null,
  createdAt: new Date(),
  updatedAt: null,
  ...overrides,
});

/** A user with a healthy Google connection (has a refresh token). */
export const setupGoogleUser = async (): Promise<{
  user: WithId<Schema_User>;
}> => UtilDriver.setupTestUser();

/**
 * A user who has never connected Google (no refresh token) -- getGcalClient
 * throws MissingGoogleRefreshToken for this user, exercising the
 * propagation swallow path (isMissingGoogleRefreshToken).
 */
export const setupNoGoogleUser = async (): Promise<{
  user: WithId<Schema_User>;
}> => {
  const user = await UserDriver.createUser({ withGoogleRefreshToken: false });
  return { user };
};
