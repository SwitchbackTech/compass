import { type calendar_v3 } from "@googleapis/calendar";
import { ObjectId } from "mongodb";
import {
  CalendarSchema,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import {
  mapCalendarRecord,
  mapGoogleCalendar,
} from "@backend/calendar/calendar.record.mapper";

const fullEntry = (): calendar_v3.Schema$CalendarListEntry => ({
  id: "gcal-1",
  etag: "etag-1",
  summary: "Work",
  summaryOverride: "My Work",
  description: "Company schedule",
  timeZone: "America/Denver",
  foregroundColor: "#ffffff",
  backgroundColor: "#5b6cff",
  accessRole: "writer",
  primary: false,
  selected: true,
});

describe("mapGoogleCalendar", () => {
  const userId = new ObjectId();

  it("maps a full entry", () => {
    const record = mapGoogleCalendar(fullEntry(), { userId });
    expect(record.name).toBe("My Work");
    expect(record.description).toBe("Company schedule");
    expect(record.timeZone).toBe("America/Denver");
    expect(record.foregroundColor).toBe("#ffffff");
    expect(record.backgroundColor).toBe("#5b6cff");
    expect(record.access).toBe("writer");
    expect(record.isPrimary).toBe(false);
    expect(record.isVisible).toBe(true);
    expect(record.isActive).toBe(true);
    expect(record.userId).toBe(userId);
    expect(record.source).toEqual({
      provider: "google",
      calendarId: "gcal-1",
      etag: "etag-1",
    });
  });

  it("prefers summaryOverride over summary", () => {
    const record = mapGoogleCalendar(
      { ...fullEntry(), summaryOverride: "Custom name" },
      { userId },
    );
    expect(record.name).toBe("Custom name");
  });

  it("falls back to summary when summaryOverride is absent", () => {
    const entry = fullEntry();
    delete entry.summaryOverride;
    const record = mapGoogleCalendar(entry, { userId });
    expect(record.name).toBe("Work");
  });

  it("defaults missing colors", () => {
    const entry = fullEntry();
    delete entry.foregroundColor;
    delete entry.backgroundColor;
    const record = mapGoogleCalendar(entry, { userId });
    expect(record.backgroundColor).toBe("#9e9e9e");
    expect(record.foregroundColor).toBe("#000000");
  });

  it("seeds isVisible from selected only when there is no existing record", () => {
    const record = mapGoogleCalendar(
      { ...fullEntry(), selected: false },
      { userId },
    );
    expect(record.isVisible).toBe(false);
  });

  it("preserves _id and isVisible from an existing record", () => {
    const existingId = new ObjectId();
    const record = mapGoogleCalendar(
      { ...fullEntry(), selected: false },
      { userId, existing: { _id: existingId, isVisible: true } },
    );
    expect(record._id).toBe(existingId);
    expect(record.isVisible).toBe(true);
  });

  it("maps reader and freeBusyReader access roles", () => {
    const reader = mapGoogleCalendar(
      { ...fullEntry(), accessRole: "reader" },
      { userId },
    );
    expect(reader.access).toBe("reader");

    const freeBusyReader = mapGoogleCalendar(
      { ...fullEntry(), accessRole: "freeBusyReader" },
      { userId },
    );
    expect(freeBusyReader.access).toBe("freeBusyReader");
  });

  it("throws when id is missing", () => {
    const entry = fullEntry();
    delete entry.id;
    expect(() => mapGoogleCalendar(entry, { userId })).toThrow();
  });

  it("throws when etag is missing", () => {
    const entry = fullEntry();
    delete entry.etag;
    expect(() => mapGoogleCalendar(entry, { userId })).toThrow();
  });

  it("throws when accessRole is invalid", () => {
    const entry = { ...fullEntry(), accessRole: "bogus" };
    expect(() => mapGoogleCalendar(entry, { userId })).toThrow();
  });
});

describe("mapCalendarRecord", () => {
  const buildRecord = (
    overrides: Partial<CalendarRecord> = {},
  ): CalendarRecord => ({
    _id: new ObjectId(),
    userId: new ObjectId(),
    name: "Work",
    description: "",
    timeZone: "America/Denver",
    foregroundColor: "#ffffff",
    backgroundColor: "#5b6cff",
    access: "writer",
    isPrimary: false,
    isVisible: true,
    isActive: true,
    source: { provider: "google", calendarId: "gcal-1", etag: "etag-1" },
    createdAt: new Date(),
    updatedAt: null,
    ...overrides,
  });

  it("produces output that parses with CalendarSchema", () => {
    const record = buildRecord();
    const calendar = mapCalendarRecord(record);
    expect(() => CalendarSchema.parse(calendar)).not.toThrow();
    expect(calendar.id).toBe(record._id.toHexString());
    expect(calendar.provider).toBe("google");
  });

  it("derives capabilities from the access role", () => {
    const record = buildRecord({ access: "freeBusyReader" });
    const calendar = mapCalendarRecord(record);
    expect(calendar.capabilities).toEqual(
      getCalendarCapabilities("freeBusyReader"),
    );
  });

  it("does not leak provider ids, etags, or userId", () => {
    const record = buildRecord();
    const calendar = mapCalendarRecord(record) as unknown as Record<
      string,
      unknown
    >;
    expect(calendar).not.toHaveProperty("userId");
    expect(calendar).not.toHaveProperty("source");
    expect(calendar).not.toHaveProperty("etag");
  });
});
