import {
  buildLocalCalendarRecord,
  transformLegacyCalendar,
} from "@scripts/common/legacy-calendar.transform";
import { ObjectId } from "mongodb";
import { CalendarRecordSchema } from "@backend/calendar/calendar.record";

const legacyGoogleCalendar = (overrides: Record<string, unknown> = {}) => ({
  _id: new ObjectId(),
  user: new ObjectId().toHexString(),
  backgroundColor: "#123456",
  color: "#abcdef",
  selected: true,
  primary: false,
  timezone: "America/New_York",
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  updatedAt: new Date("2025-06-01T00:00:00.000Z"),
  metadata: {
    id: "google-calendar-id",
    etag: '"etag-value"',
    summary: "Work",
    summaryOverride: null,
    description: "My work calendar",
    accessRole: "owner",
  },
  ...overrides,
});

describe("transformLegacyCalendar", () => {
  it("fails invalidShape for a non-object doc", () => {
    const result = transformLegacyCalendar("nope");
    expect(result).toEqual({
      ok: false,
      legacyId: null,
      reason: "invalidShape",
    });
  });

  it("fails invalidShape when _id is missing", () => {
    const { _id, ...rest } = legacyGoogleCalendar();
    const result = transformLegacyCalendar(rest);
    expect(result).toEqual(
      expect.objectContaining({ ok: false, reason: "invalidShape" }),
    );
  });

  it("fails invalidShape when user is missing", () => {
    const { user, ...rest } = legacyGoogleCalendar();
    const result = transformLegacyCalendar(rest);
    expect(result).toEqual(
      expect.objectContaining({ ok: false, reason: "invalidShape" }),
    );
  });

  it("fails missingProviderIdentity when metadata.id is missing", () => {
    const legacy = legacyGoogleCalendar({
      metadata: { etag: '"etag-value"', accessRole: "owner" },
    });
    const result = transformLegacyCalendar(legacy);
    expect(result).toEqual(
      expect.objectContaining({ ok: false, reason: "missingProviderIdentity" }),
    );
  });

  it("fails missingProviderIdentity when metadata.etag is missing", () => {
    const legacy = legacyGoogleCalendar({
      metadata: { id: "google-calendar-id", accessRole: "owner" },
    });
    const result = transformLegacyCalendar(legacy);
    expect(result).toEqual(
      expect.objectContaining({ ok: false, reason: "missingProviderIdentity" }),
    );
  });

  it("renames fields onto the final record shape and preserves _id", () => {
    const legacy = legacyGoogleCalendar();
    const result = transformLegacyCalendar(legacy);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.record._id.equals(legacy._id)).toBe(true);
    expect(result.record.userId.toHexString()).toBe(legacy.user);
    expect(result.record.name).toBe("Work");
    expect(result.record.description).toBe("My work calendar");
    expect(result.record.timeZone).toBe("America/New_York");
    expect(result.record.foregroundColor).toBe("#abcdef");
    expect(result.record.backgroundColor).toBe("#123456");
    expect(result.record.access).toBe("owner");
    expect(result.record.isPrimary).toBe(false);
    expect(result.record.isVisible).toBe(true);
    expect(result.record.isActive).toBe(true);
    expect(result.record.source).toEqual({
      provider: "google",
      calendarId: "google-calendar-id",
      etag: '"etag-value"',
    });
    expect(result.record.createdAt).toEqual(legacy.createdAt);
    expect(result.record.updatedAt).toEqual(legacy.updatedAt);
  });

  it("prefers summaryOverride over summary for name", () => {
    const legacy = legacyGoogleCalendar({
      metadata: {
        id: "google-calendar-id",
        etag: '"etag-value"',
        summary: "Work",
        summaryOverride: "My Work",
        accessRole: "owner",
      },
    });
    const result = transformLegacyCalendar(legacy);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.record.name).toBe("My Work");
  });

  it("defaults a missing/null description to an empty string", () => {
    const legacy = legacyGoogleCalendar({
      metadata: {
        id: "google-calendar-id",
        etag: '"etag-value"',
        summary: "Work",
        accessRole: "owner",
      },
    });
    const result = transformLegacyCalendar(legacy);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.record.description).toBe("");
  });

  it("defaults createdAt to the ObjectId timestamp when absent", () => {
    const { createdAt, ...rest } = legacyGoogleCalendar();
    const result = transformLegacyCalendar(rest);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.createdAt.getTime()).toBe(
        (rest._id as ObjectId).getTimestamp().getTime(),
      );
    }
  });

  it("defaults a missing updatedAt to null", () => {
    const { updatedAt, ...rest } = legacyGoogleCalendar();
    const result = transformLegacyCalendar(rest);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.record.updatedAt).toBeNull();
  });

  it("preserves visibility (selected -> isVisible) and primary (primary -> isPrimary)", () => {
    const legacy = legacyGoogleCalendar({ selected: false, primary: true });
    const result = transformLegacyCalendar(legacy);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.isVisible).toBe(false);
      expect(result.record.isPrimary).toBe(true);
    }
  });
});

describe("buildLocalCalendarRecord", () => {
  it("builds a record that parses against CalendarRecordSchema", () => {
    const userId = new ObjectId();
    const now = new Date("2026-01-01T00:00:00.000Z");
    const record = buildLocalCalendarRecord(userId, now);

    expect(() => CalendarRecordSchema.parse(record)).not.toThrow();
    expect(record.userId.equals(userId)).toBe(true);
    expect(record.name).toBe("Compass");
    expect(record.description).toBe("");
    expect(record.timeZone).toBeNull();
    expect(record.foregroundColor).toBe("#000000");
    expect(record.backgroundColor).toBe("#9e9e9e");
    expect(record.access).toBe("owner");
    expect(record.isPrimary).toBe(false);
    expect(record.isVisible).toBe(true);
    expect(record.isActive).toBe(true);
    expect(record.source).toEqual({ provider: "local" });
    expect(record.createdAt).toBe(now);
    expect(record.updatedAt).toBeNull();
  });
});
