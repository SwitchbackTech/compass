import { faker } from "@faker-js/faker";
import { type Db } from "mongodb";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { type EventOccurrenceRecord } from "@sync/storage/contracts/event-occurrence.contracts";
import {
  EventOccurrenceRepository,
  type OccurrenceInput,
} from "@sync/storage/repositories/event-occurrence.repository";

const objectId = () => faker.database.mongodbObjectId();

const occurrence = (
  overrides: Partial<OccurrenceInput> = {},
): OccurrenceInput =>
  ({
    tenantId: objectId(),
    principalId: objectId(),
    eventId: objectId(),
    occurrenceKey: `${objectId()}:2026-07-14T09:00:00-06:00`,
    calendarId: objectId(),
    schedule: {
      kind: "timed",
      start: "2026-07-14T09:00:00-06:00",
      end: "2026-07-14T10:00:00-06:00",
      timeZone: "America/Denver",
    },
    startAt: new Date("2026-07-14T09:00:00-06:00"),
    busy: true,
    title: "Standup",
    cancelled: false,
    generation: 0,
    ...overrides,
  }) as OccurrenceInput;

describe("EventOccurrenceRepository", () => {
  const storage = setupSyncStorage();
  let db: Db;
  let repo: EventOccurrenceRepository;

  beforeEach(() => {
    db = storage.db();
    repo = new EventOccurrenceRepository(db, storage.client());
  });

  it("materializes occurrences for an event", async () => {
    const eventId = objectId() as OccurrenceInput["eventId"];
    await repo.replaceForEvent(eventId, 0, [
      occurrence({ eventId, occurrenceKey: `${eventId}:a` }),
      occurrence({ eventId, occurrenceKey: `${eventId}:b` }),
    ]);
    expect(await db.collection("event_occurrences").countDocuments()).toBe(2);
  });

  it("replaces only the target event's occurrences in that generation", async () => {
    const target = objectId() as OccurrenceInput["eventId"];
    const other = objectId() as OccurrenceInput["eventId"];
    await repo.replaceForEvent(target, 0, [
      occurrence({ eventId: target, occurrenceKey: `${target}:old` }),
    ]);
    await repo.replaceForEvent(other, 0, [
      occurrence({ eventId: other, occurrenceKey: `${other}:x` }),
    ]);

    // Rebuild the target with new occurrences; the other event is untouched.
    await repo.replaceForEvent(target, 0, [
      occurrence({ eventId: target, occurrenceKey: `${target}:new1` }),
      occurrence({ eventId: target, occurrenceKey: `${target}:new2` }),
    ]);

    const targetDocs = await db
      .collection("event_occurrences")
      .find({ eventId: target })
      .toArray();
    expect(targetDocs.map((d) => d.occurrenceKey).sort()).toEqual([
      `${target}:new1`,
      `${target}:new2`,
    ]);
    expect(
      await db
        .collection("event_occurrences")
        .countDocuments({ eventId: other }),
    ).toBe(1);
  });

  it("does not disturb another generation of the same event (non-destructive repair)", async () => {
    const eventId = objectId() as OccurrenceInput["eventId"];
    // The SAME occurrence (same eventId + occurrenceKey) in two generations: the
    // unique index includes generation, so a repair building generation 1 does
    // not collide with the live generation 0.
    const key = `${eventId}:instant`;
    await repo.replaceForEvent(eventId, 0, [
      occurrence({ eventId, occurrenceKey: key, generation: 0 }),
    ]);
    await repo.replaceForEvent(eventId, 1, [
      occurrence({ eventId, occurrenceKey: key, generation: 1 }),
    ]);
    expect(
      await db.collection("event_occurrences").countDocuments({ eventId }),
    ).toBe(2);
  });

  it("clears occurrences when replaced with an empty set", async () => {
    const eventId = objectId() as OccurrenceInput["eventId"];
    await repo.replaceForEvent(eventId, 0, [
      occurrence({ eventId, occurrenceKey: `${eventId}:a` }),
    ]);
    await repo.replaceForEvent(eventId, 0, []);
    expect(
      await db.collection("event_occurrences").countDocuments({ eventId }),
    ).toBe(0);
  });

  describe("listByCalendarRange", () => {
    const tenantId = objectId();
    const principalId = objectId();
    const calA = objectId();
    const calB = objectId();

    beforeEach(async () => {
      const mk = (calendarId: string, day: number) =>
        occurrence({
          tenantId: tenantId as OccurrenceInput["tenantId"],
          principalId: principalId as OccurrenceInput["principalId"],
          eventId: objectId() as OccurrenceInput["eventId"],
          occurrenceKey: `${calendarId}:${day}`,
          calendarId: calendarId as OccurrenceInput["calendarId"],
          schedule: {
            kind: "timed",
            start: `2026-07-${day}T09:00:00-06:00`,
            end: `2026-07-${day}T10:00:00-06:00`,
            timeZone: "America/Denver",
          },
          startAt: new Date(`2026-07-${day}T09:00:00-06:00`),
        });
      const eventId = objectId() as OccurrenceInput["eventId"];
      await repo.replaceForEvent(eventId, 0, [
        mk(calA, 10),
        mk(calA, 14),
        mk(calB, 12),
        mk(calA, 20), // outside the query range below
      ]);
    });

    it("returns occurrences across multiple calendars in range, ordered", async () => {
      const page = await repo.listByCalendarRange({
        tenantId: tenantId as OccurrenceInput["tenantId"],
        principalId: principalId as OccurrenceInput["principalId"],
        calendars: [
          { calendarId: calA, generation: 0 },
          { calendarId: calB, generation: 0 },
        ],
        start: new Date("2026-07-01T00:00:00-06:00"),
        end: new Date("2026-07-16T00:00:00-06:00"),
        limit: 100,
      });
      expect(page).toHaveLength(3);
      const starts = page.map((o) => o.startAt.getTime());
      expect(starts).toEqual([...starts].sort((a, b) => a - b));
    });

    it("paginates with the composite cursor", async () => {
      const query = {
        tenantId: tenantId as OccurrenceInput["tenantId"],
        principalId: principalId as OccurrenceInput["principalId"],
        calendars: [
          { calendarId: calA, generation: 0 },
          { calendarId: calB, generation: 0 },
        ],
        start: new Date("2026-07-01T00:00:00-06:00"),
        end: new Date("2026-07-16T00:00:00-06:00"),
      };
      const first = await repo.listByCalendarRange({ ...query, limit: 2 });
      const last = first[first.length - 1] as EventOccurrenceRecord;
      const second = await repo.listByCalendarRange({
        ...query,
        limit: 2,
        after: { startAt: last.startAt, id: last._id },
      });
      const ids = new Set([...first, ...second].map((o) => o._id));
      expect(first).toHaveLength(2);
      expect(second).toHaveLength(1);
      expect(ids.size).toBe(3);
    });

    it("paginates correctly across occurrences that share the same startAt", async () => {
      // Five occurrences at the SAME instant straddling page boundaries — the
      // (_id) tie-break in the composite cursor must not skip or repeat any.
      const tenant2 = objectId() as OccurrenceInput["tenantId"];
      const principal2 = objectId() as OccurrenceInput["principalId"];
      const cal = objectId();
      const sameInstant = new Date("2026-07-14T09:00:00-06:00");
      const eventId = objectId() as OccurrenceInput["eventId"];
      await repo.replaceForEvent(
        eventId,
        0,
        Array.from({ length: 5 }, (_, i) =>
          occurrence({
            tenantId: tenant2,
            principalId: principal2,
            eventId,
            occurrenceKey: `${cal}:tie:${i}`,
            calendarId: cal as OccurrenceInput["calendarId"],
            startAt: sameInstant,
          }),
        ),
      );

      const query = {
        tenantId: tenant2,
        principalId: principal2,
        calendars: [
          { calendarId: cal as OccurrenceInput["calendarId"], generation: 0 },
        ],
        start: new Date("2026-07-01T00:00:00-06:00"),
        end: new Date("2026-07-16T00:00:00-06:00"),
      };
      const seen: string[] = [];
      let after: { startAt: Date; id: string } | undefined;
      for (let i = 0; i < 10; i += 1) {
        const page = await repo.listByCalendarRange({
          ...query,
          limit: 2,
          after,
        });
        if (page.length === 0) break;
        for (const o of page) seen.push(o._id);
        const lastRow = page[page.length - 1];
        if (!lastRow) break;
        after = { startAt: lastRow.startAt, id: lastRow._id };
      }
      expect(seen).toHaveLength(5);
      expect(new Set(seen).size).toBe(5);
    });

    it("reads only the requested generation, hiding a repair's new one", async () => {
      const tenant = objectId() as OccurrenceInput["tenantId"];
      const principal = objectId() as OccurrenceInput["principalId"];
      const cal = objectId() as OccurrenceInput["calendarId"];
      const at = new Date("2026-07-14T09:00:00-06:00");
      const mk = (eventId: string, gen: number, key: string) =>
        repo.replaceForEvent(eventId as OccurrenceInput["eventId"], gen, [
          occurrence({
            tenantId: tenant,
            principalId: principal,
            eventId: eventId as OccurrenceInput["eventId"],
            occurrenceKey: key,
            calendarId: cal,
            startAt: at,
            generation: gen,
          }),
        ]);
      // The live generation 0 and a repair building generation 1 coexist.
      await mk(objectId(), 0, `${cal}:live`);
      await mk(objectId(), 1, `${cal}:repair`);

      const range = {
        start: new Date("2026-07-01T00:00:00-06:00"),
        end: new Date("2026-07-16T00:00:00-06:00"),
        limit: 100,
      };
      // Reading the active generation shows only the live row, never the repair.
      const live = await repo.listByCalendarRange({
        tenantId: tenant,
        principalId: principal,
        calendars: [{ calendarId: cal, generation: 0 }],
        ...range,
      });
      expect(live).toHaveLength(1);
      expect(live[0]?.occurrenceKey).toBe(`${cal}:live`);
      // Reading generation 1 (post-activation) shows only the repair's row.
      const repaired = await repo.listByCalendarRange({
        tenantId: tenant,
        principalId: principal,
        calendars: [{ calendarId: cal, generation: 1 }],
        ...range,
      });
      expect(repaired).toHaveLength(1);
      expect(repaired[0]?.occurrenceKey).toBe(`${cal}:repair`);
    });
  });
});
