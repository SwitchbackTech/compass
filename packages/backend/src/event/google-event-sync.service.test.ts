import { ObjectId } from "mongodb";
import { type gSchema$Event } from "@core/types/gcal";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import { type GoogleRequestContext } from "@backend/common/services/gcal/gcal.context";
import { type EventRecord } from "@backend/event/event.record";
import { eventRepository } from "@backend/event/event.repository";
import { GoogleEventSync } from "@backend/event/google-event-sync.service";

const calendar: CalendarRecord = {
  _id: new ObjectId(),
  userId: new ObjectId(),
  name: "Primary",
  description: "",
  timeZone: "America/Denver",
  foregroundColor: "#ffffff",
  backgroundColor: "#000000",
  access: "owner",
  isPrimary: true,
  isVisible: true,
  isActive: true,
  source: {
    provider: "google",
    calendarId: "primary@example.com",
    etag: "etag",
  },
  createdAt: new Date("2026-07-14T00:00:00.000Z"),
  updatedAt: null,
};

const googleEvent = (id: string): gSchema$Event => ({
  id,
  summary: id,
  start: {
    dateTime: "2026-07-14T09:00:00-06:00",
    timeZone: "America/Denver",
  },
  end: {
    dateTime: "2026-07-14T10:00:00-06:00",
    timeZone: "America/Denver",
  },
});

describe("GoogleEventSync", () => {
  afterEach(() => jest.restoreAllMocks());

  it("writes a page of standalone events in one batch", async () => {
    const findSpy = jest
      .spyOn(eventRepository, "findByExternalReference")
      .mockResolvedValue(null);
    const findManySpy = jest
      .spyOn(eventRepository, "findByExternalReferences")
      .mockResolvedValue([]);
    const insertSpy = jest
      .spyOn(eventRepository, "insertOne")
      .mockImplementation(async (record) => record);
    const bulkSpy = jest
      .spyOn(eventRepository, "bulkReplace")
      .mockResolvedValue();
    const sync = new GoogleEventSync({} as GoogleRequestContext, calendar);

    const page = Array.from({ length: 2500 }, (_, index) =>
      googleEvent(`event-${index}`),
    );
    const result = await sync.apply(page);

    expect(result).toMatchObject({ processed: 2500, saved: 2500 });
    expect(bulkSpy).toHaveBeenCalledTimes(1);
    expect(findManySpy).toHaveBeenCalledTimes(1);
    expect(findSpy).not.toHaveBeenCalled();
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("keeps cancellation handling on the individual event path", async () => {
    jest
      .spyOn(eventRepository, "findByExternalReferences")
      .mockResolvedValue([]);
    const bulkSpy = jest
      .spyOn(eventRepository, "bulkReplace")
      .mockResolvedValue();
    const deletedId = new ObjectId();
    const deleteSpy = jest
      .spyOn(eventRepository, "deleteByExternalReference")
      .mockResolvedValue({ deletedIds: [deletedId] });
    const sync = new GoogleEventSync({} as GoogleRequestContext, calendar);

    const result = await sync.apply([
      googleEvent("standalone"),
      { id: "cancelled", status: "cancelled" },
    ]);

    expect(result).toMatchObject({ processed: 2, saved: 1, deleted: 1 });
    expect(bulkSpy.mock.calls[0]![0]).toHaveLength(1);
    expect(deleteSpy).toHaveBeenCalledWith(
      calendar._id,
      "cancelled",
      undefined,
    );
  });

  it("preserves database identity when replacing an existing event", async () => {
    const existing: EventRecord = {
      _id: new ObjectId(),
      calendarId: calendar._id,
      content: { kind: "details", title: "old", description: "" },
      schedule: {
        kind: "timed",
        start: new Date("2026-07-14T15:00:00.000Z"),
        end: new Date("2026-07-14T16:00:00.000Z"),
        timeZone: "America/Denver",
      },
      recurrence: { kind: "single" },
      externalReference: {
        provider: "google",
        eventId: "event-1",
        recurringEventId: null,
      },
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: null,
    };
    jest
      .spyOn(eventRepository, "findByExternalReferences")
      .mockResolvedValue([existing]);
    const bulkSpy = jest
      .spyOn(eventRepository, "bulkReplace")
      .mockResolvedValue();
    const sync = new GoogleEventSync({} as GoogleRequestContext, calendar);

    await sync.apply([googleEvent("event-1")]);

    const [records] = bulkSpy.mock.calls[0]!;
    expect(records[0]).toMatchObject({
      _id: existing._id,
      createdAt: existing.createdAt,
      content: { kind: "details", title: "event-1" },
    });
  });

  it("counts ignored and invalid standalone events without individual writes", async () => {
    jest
      .spyOn(eventRepository, "findByExternalReferences")
      .mockResolvedValue([]);
    const insertSpy = jest
      .spyOn(eventRepository, "insertOne")
      .mockImplementation(async (record) => record);
    const bulkSpy = jest
      .spyOn(eventRepository, "bulkReplace")
      .mockResolvedValue();
    const missingId = googleEvent("missing-id");
    delete missingId.id;
    const sync = new GoogleEventSync({} as GoogleRequestContext, calendar);

    const result = await sync.apply([
      googleEvent("event-1"),
      { ...googleEvent("ignored"), eventType: "outOfOffice" },
      missingId,
    ]);

    expect(result).toMatchObject({
      processed: 3,
      saved: 1,
      ignored: 1,
      invalid: 1,
    });
    expect(bulkSpy.mock.calls[0]![0]).toHaveLength(1);
    expect(insertSpy).not.toHaveBeenCalled();
  });
});
