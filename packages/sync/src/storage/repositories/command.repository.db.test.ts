import { faker } from "@faker-js/faker";
import { type Db } from "mongodb";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { type CommandSubmit } from "@sync/storage/contracts/command.contracts";
import { CommandRepository } from "@sync/storage/repositories/command.repository";

const objectId = () => faker.database.mongodbObjectId();

const timed = {
  kind: "timed",
  start: "2026-07-14T09:00:00-06:00",
  end: "2026-07-14T10:00:00-06:00",
  timeZone: "America/Denver",
};
const content = {
  title: "Standup",
  description: "",
  location: null,
  organizer: null,
  attendees: [],
  conference: null,
};

const submit = (overrides: Partial<CommandSubmit> = {}): CommandSubmit =>
  ({
    tenantId: objectId(),
    principalId: objectId(),
    idempotencyKey: "key-1",
    eventId: objectId(),
    input: {
      kind: "create",
      calendarId: objectId(),
      content,
      schedule: timed,
      recurrence: { kind: "single" },
    },
    expectedVersion: null,
    ...overrides,
  }) as CommandSubmit;

describe("CommandRepository", () => {
  const storage = setupSyncStorage(import.meta.url);
  let db: Db;
  let repo: CommandRepository;

  beforeEach(() => {
    db = storage.db();
    repo = new CommandRepository(db);
  });

  it("submits a new command as pending with zero attempts", async () => {
    const command = await repo.submit(submit());
    expect(command.outcome).toEqual({ state: "pending" });
    expect(command.attemptCount).toBe(0);
    expect(command._id).toMatch(/^[0-9a-f]{24}$/);
  });

  it("returns the existing command for a repeated idempotency key", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const first = await repo.submit(
      submit({ tenantId, principalId, idempotencyKey: "dup" }),
    );
    // A retried submit must not create a second command or reset progress.
    await repo.updateOutcome(
      tenantId,
      principalId,
      first._id,
      { state: "applying" },
      1,
    );
    const second = await repo.submit(
      submit({ tenantId, principalId, idempotencyKey: "dup" }),
    );

    expect(second._id).toBe(first._id);
    expect(second.outcome).toEqual({ state: "applying" });
    expect(second.attemptCount).toBe(1);
    expect(await db.collection("commands").countDocuments()).toBe(1);
  });

  it("transitions outcome through the command lifecycle", async () => {
    const command = await repo.submit(submit());
    const applying = await repo.updateOutcome(
      command.tenantId,
      command.principalId,
      command._id,
      { state: "applying" },
      1,
    );
    expect(applying?.outcome).toEqual({ state: "applying" });

    const confirmed = await repo.updateOutcome(
      command.tenantId,
      command.principalId,
      command._id,
      {
        state: "confirmed",
        providerEventId: "evt-1",
        providerVersion: "etag-1",
      },
      1,
    );
    expect(confirmed?.outcome).toMatchObject({ state: "confirmed" });
  });

  it("rejects an outcome update from another principal", async () => {
    const command = await repo.submit(submit());
    const result = await repo.updateOutcome(
      command.tenantId,
      objectId() as CommandSubmit["principalId"],
      command._id,
      { state: "applying" },
      1,
    );
    expect(result).toBeNull();
  });

  it("lists only nonterminal commands, oldest first", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const a = await repo.submit(
      submit({ tenantId, principalId, idempotencyKey: "a" }),
    );
    await repo.submit(submit({ tenantId, principalId, idempotencyKey: "b" }));
    // Terminate one; it should drop out of the nonterminal list.
    await repo.updateOutcome(
      tenantId,
      principalId,
      a._id,
      { state: "confirmed", providerEventId: null, providerVersion: null },
      1,
    );

    const pending = await repo.listNonterminal(tenantId, principalId, 100);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.idempotencyKey).toBe("b");
  });

  it("reports a nonterminal command for an event, and none once it terminates", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const eventId = objectId();
    const command = await repo.submit(
      submit({ tenantId, principalId, eventId }),
    );

    expect(
      await repo.hasNonterminalForEvent(
        tenantId,
        principalId,
        eventId as never,
      ),
    ).toBe(true);
    // A different event has no in-flight command.
    expect(
      await repo.hasNonterminalForEvent(
        tenantId,
        principalId,
        objectId() as never,
      ),
    ).toBe(false);

    await repo.updateOutcome(
      tenantId,
      principalId,
      command._id,
      { state: "confirmed", providerEventId: null, providerVersion: null },
      1,
    );
    // Terminal now — no longer in flight.
    expect(
      await repo.hasNonterminalForEvent(
        tenantId,
        principalId,
        eventId as never,
      ),
    ).toBe(false);
  });

  it("rejects a raw duplicate insert violating the idempotency index", async () => {
    const shared = {
      tenantId: objectId(),
      principalId: objectId(),
      idempotencyKey: "same",
    };
    const collection = db.collection("commands");
    await collection.insertOne({ _id: objectId(), ...shared } as never);
    await expect(
      collection.insertOne({ _id: objectId(), ...shared } as never),
    ).rejects.toThrow();
  });
});
