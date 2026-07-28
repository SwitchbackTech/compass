import { faker } from "@faker-js/faker";
import { type Db } from "mongodb";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { type ProviderCalendarUpsert } from "@sync/storage/contracts/provider-calendar.contracts";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";

const objectId = () => faker.database.mongodbObjectId();

const baseUpsert = (
  overrides: Partial<ProviderCalendarUpsert> = {},
): ProviderCalendarUpsert =>
  ({
    tenantId: objectId(),
    principalId: objectId(),
    connectionId: objectId(),
    providerCalendarId: "primary",
    displayName: "Personal",
    color: "#9fe1e7",
    active: true,
    primary: true,
    accessRole: "owner",
    capabilities: {
      canReadEvents: true,
      canWriteEvents: true,
      canReadBusy: true,
      canInviteAttendees: true,
    },
    ...overrides,
  }) as ProviderCalendarUpsert;

describe("ProviderCalendarRepository", () => {
  const storage = setupSyncStorage(import.meta.url);
  let db: Db;
  let repo: ProviderCalendarRepository;

  beforeEach(() => {
    db = storage.db();
    repo = new ProviderCalendarRepository(db);
  });

  it("assigns a stable id on first upsert", async () => {
    const created = await repo.upsertByProviderCalendar(baseUpsert());
    expect(created._id).toMatch(/^[0-9a-f]{24}$/);
    expect(created.primary).toBe(true);
  });

  it("keeps the Sync id stable when the calendar is renamed", async () => {
    const connectionId = objectId();
    const first = await repo.upsertByProviderCalendar(
      baseUpsert({ connectionId, displayName: "Personal" }),
    );
    const renamed = await repo.upsertByProviderCalendar(
      baseUpsert({ connectionId, displayName: "Personal (renamed)" }),
    );
    expect(renamed._id).toBe(first._id);
    expect(renamed.displayName).toBe("Personal (renamed)");
  });

  it("stores multiple calendars for one connection", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const connectionId = objectId();
    await repo.upsertByProviderCalendar(
      baseUpsert({
        tenantId,
        principalId,
        connectionId,
        providerCalendarId: "primary",
      }),
    );
    await repo.upsertByProviderCalendar(
      baseUpsert({
        tenantId,
        principalId,
        connectionId,
        providerCalendarId: "work@group",
      }),
    );
    const all = await repo.listByConnection(
      tenantId,
      principalId,
      connectionId,
    );
    expect(all).toHaveLength(2);
  });

  it("updates provider facts and capabilities on re-discovery", async () => {
    const connectionId = objectId();
    await repo.upsertByProviderCalendar(
      baseUpsert({ connectionId, active: true, accessRole: "owner" }),
    );
    const updated = await repo.upsertByProviderCalendar(
      baseUpsert({
        connectionId,
        active: false,
        accessRole: "viewer",
        capabilities: {
          canReadEvents: true,
          canWriteEvents: false,
          canReadBusy: true,
          canInviteAttendees: false,
        },
      }),
    );
    expect(updated.active).toBe(false);
    expect(updated.accessRole).toBe("viewer");
    expect(updated.capabilities.canWriteEvents).toBe(false);
  });

  it("does not leak calendars across principals", async () => {
    const tenantId = objectId();
    const connectionId = objectId();
    const mine = objectId();
    const theirs = objectId();
    await repo.upsertByProviderCalendar(
      baseUpsert({ tenantId, principalId: mine, connectionId }),
    );
    expect(
      await repo.listByConnection(tenantId, theirs, connectionId),
    ).toHaveLength(0);
  });

  it("persists and updates the calendar's custom event-color labels", async () => {
    const connectionId = objectId();
    const created = await repo.upsertByProviderCalendar(
      baseUpsert({
        connectionId,
        eventLabels: [{ id: "label-1", hex: "#009688" }],
      }),
    );
    expect(created.eventLabels).toEqual([{ id: "label-1", hex: "#009688" }]);

    const updated = await repo.upsertByProviderCalendar(
      baseUpsert({ connectionId, eventLabels: [] }),
    );
    expect(updated.eventLabels).toEqual([]);
  });

  it("defaults eventLabels to empty when the caller omits it", async () => {
    const created = await repo.upsertByProviderCalendar(baseUpsert());
    expect(created.eventLabels).toEqual([]);
  });

  it("rejects a duplicate (connection, provider-calendar) identity", async () => {
    const shared = {
      tenantId: objectId(),
      principalId: objectId(),
      connectionId: objectId(),
      providerCalendarId: "primary",
    };
    const collection = db.collection("provider_calendars");
    await collection.insertOne({ _id: objectId(), ...shared } as never);
    await expect(
      collection.insertOne({ _id: objectId(), ...shared } as never),
    ).rejects.toThrow();
  });
});
