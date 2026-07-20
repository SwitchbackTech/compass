import { faker } from "@faker-js/faker";
import { type Db, MongoClient } from "mongodb";
import { type EventRecord } from "@sync/storage/event.record";
import {
  EventRepository,
  type ProviderEventUpsert,
} from "@sync/storage/event.repository";
import { installIndexManifest } from "@sync/storage/index-manifest";

const uri = process.env["SYNC_MONGO_URI"] as string;
const objectId = () => faker.database.mongodbObjectId();

const timed = (start: string, end: string, timeZone = "America/Denver") => ({
  kind: "timed" as const,
  start,
  end,
  timeZone,
});

const baseContent = {
  title: "Standup",
  description: "",
  location: null,
  organizer: null,
  attendees: [],
  conference: null,
};

const linkedUpsert = (
  overrides: Partial<ProviderEventUpsert> = {},
): ProviderEventUpsert =>
  ({
    tenantId: objectId(),
    principalId: objectId(),
    origin: "provider",
    calendarId: objectId(),
    clientEventId: null,
    connectionId: objectId(),
    providerEventId: "evt-1",
    providerVersion: "etag-1",
    providerUpdatedAt: new Date("2026-07-20T12:00:00.000Z"),
    deliveryState: "confirmed",
    providerMetadata: null,
    content: baseContent,
    schedule: timed("2026-07-14T09:00:00-06:00", "2026-07-14T10:00:00-06:00"),
    recurrence: { kind: "single" },
    lifecycleState: "active",
    generation: 0,
    confirmedAt: new Date("2026-07-20T12:00:00.000Z"),
    ...overrides,
  }) as ProviderEventUpsert;

const compassRecord = (overrides: Partial<EventRecord> = {}): EventRecord =>
  ({
    _id: objectId(),
    tenantId: objectId(),
    principalId: objectId(),
    origin: "compass",
    calendarId: objectId(),
    clientEventId: null,
    connectionId: null,
    providerEventId: null,
    providerVersion: null,
    providerUpdatedAt: null,
    deliveryState: null,
    providerMetadata: null,
    content: baseContent,
    schedule: timed("2026-07-14T09:00:00-06:00", "2026-07-14T10:00:00-06:00"),
    recurrence: { kind: "single" },
    lifecycleState: "active",
    generation: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    confirmedAt: null,
    ...overrides,
  }) as EventRecord;

describe("EventRepository", () => {
  let client: MongoClient;
  let db: Db;
  let repo: EventRepository;

  beforeEach(async () => {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(`event_${objectId()}`);
    await installIndexManifest(db);
    repo = new EventRepository(db);
  });

  afterEach(async () => {
    await db.dropDatabase();
    await client.close();
  });

  it("dedupes a linked event on provider identity across repeated reads", async () => {
    const identity = {
      connectionId: objectId(),
      calendarId: objectId(),
      providerEventId: "evt-42",
    };
    const first = await repo.upsertByProviderIdentity(
      linkedUpsert({ ...identity, providerVersion: "etag-1" }),
    );
    const second = await repo.upsertByProviderIdentity(
      linkedUpsert({ ...identity, providerVersion: "etag-2" }),
    );
    expect(second._id).toBe(first._id);
    expect(second.providerVersion).toBe("etag-2");
    expect(await db.collection("events").countDocuments()).toBe(1);
  });

  it("stores many unlinked Compass events (no provider identity collision)", async () => {
    const principalId = objectId();
    await repo.put(compassRecord({ principalId }));
    await repo.put(compassRecord({ principalId }));
    expect(await db.collection("events").countDocuments()).toBe(2);
  });

  it("round-trips an all-day event", async () => {
    const record = compassRecord({
      schedule: { kind: "allDay", start: "2026-07-14", end: "2026-07-15" },
    });
    const saved = await repo.put(record);
    const read = await repo.findById(
      saved.tenantId,
      saved.principalId,
      saved._id,
    );
    expect(read?.schedule).toEqual({
      kind: "allDay",
      start: "2026-07-14",
      end: "2026-07-15",
    });
  });

  it("round-trips a DST-crossing timed schedule", async () => {
    const dst = timed("2026-03-08T01:30:00-07:00", "2026-03-08T03:30:00-06:00");
    const saved = await repo.put(compassRecord({ schedule: dst }));
    const read = await repo.findById(
      saved.tenantId,
      saved.principalId,
      saved._id,
    );
    expect(read?.schedule).toEqual(dst);
  });

  it("round-trips a recurrence exception event", async () => {
    const seriesId = objectId();
    const record = compassRecord({
      recurrence: {
        kind: "exception",
        seriesId: seriesId as EventRecord["_id"],
        recurrenceId: "2026-07-21T09:00:00.000Z" as never,
        cancelled: true,
      },
    });
    const saved = await repo.put(record);
    const read = await repo.findById(
      saved.tenantId,
      saved.principalId,
      saved._id,
    );
    expect(read?.recurrence).toMatchObject({
      kind: "exception",
      cancelled: true,
    });
  });

  it("scopes findById to the owning principal", async () => {
    const saved = await repo.put(compassRecord());
    const other = objectId() as EventRecord["principalId"];
    expect(await repo.findById(saved.tenantId, other, saved._id)).toBeNull();
    expect(
      await repo.findById(saved.tenantId, saved.principalId, saved._id),
    ).not.toBeNull();
  });

  describe("listByCalendar keyset pagination", () => {
    const tenantId = objectId();
    const principalId = objectId();
    const calendarId = objectId();

    beforeEach(async () => {
      for (let i = 0; i < 5; i += 1) {
        await repo.put(
          compassRecord({
            tenantId: tenantId as EventRecord["tenantId"],
            principalId: principalId as EventRecord["principalId"],
            calendarId: calendarId as EventRecord["calendarId"],
          }),
        );
      }
      // An event in a different generation must be excluded by the query.
      await repo.put(
        compassRecord({
          tenantId: tenantId as EventRecord["tenantId"],
          principalId: principalId as EventRecord["principalId"],
          calendarId: calendarId as EventRecord["calendarId"],
          generation: 1,
        }),
      );
    });

    const baseQuery = {
      tenantId: tenantId as EventRecord["tenantId"],
      principalId: principalId as EventRecord["principalId"],
      calendarId,
      generation: 0,
    };

    it("returns only the requested generation, id-ordered", async () => {
      const page = await repo.listByCalendar({ ...baseQuery, limit: 100 });
      expect(page).toHaveLength(5);
      const ids = page.map((e) => e._id);
      expect(ids).toEqual([...ids].sort());
    });

    it("paginates without skipping or repeating via the id cursor", async () => {
      const seen: string[] = [];
      let afterId: EventRecord["_id"] | undefined;
      for (let i = 0; i < 10; i += 1) {
        const page = await repo.listByCalendar({
          ...baseQuery,
          limit: 2,
          afterId,
        });
        if (page.length === 0) break;
        for (const e of page) seen.push(e._id);
        afterId = page[page.length - 1]?._id;
      }
      expect(seen).toHaveLength(5);
      expect(new Set(seen).size).toBe(5);
    });
  });
});
