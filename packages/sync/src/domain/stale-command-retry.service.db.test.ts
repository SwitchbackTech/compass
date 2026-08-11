import { faker } from "@faker-js/faker";
import {
  type ConnectionId,
  type EventId,
  type IdempotencyKey,
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { seedProviderCalendar } from "@sync/__tests__/helpers/fixtures";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { submitCloudCommand } from "@sync/domain/cloud-command.service";
import { retryStaleCommands } from "@sync/domain/stale-command-retry.service";
import { type ProviderEvent } from "@sync/providers/provider-event.port";
import {
  type ProviderDeleteInput,
  type ProviderEventWriter,
  ProviderWriteError,
} from "@sync/providers/provider-event-writer.port";
import { CommandRepository } from "@sync/storage/repositories/command.repository";
import { DeletionMarkerRepository } from "@sync/storage/repositories/deletion-marker.repository";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { type SyncMongoService } from "@sync/storage/sync-mongo.service";
import { beforeEach, describe, expect, it } from "bun:test";

const storage = setupSyncStorage(import.meta.url);
const objectId = () => faker.database.mongodbObjectId();

class FakeDeleteWriter implements ProviderEventWriter {
  readonly provider = "google" as const;
  deleteError: Error | null = null;
  deleteCalls: ProviderDeleteInput[] = [];
  async deleteEvent(input: ProviderDeleteInput): Promise<void> {
    this.deleteCalls.push(input);
    if (this.deleteError) throw this.deleteError;
  }
  async createEvent(): Promise<never> {
    throw new Error("unused");
  }
  async patchEvent(): Promise<never> {
    throw new Error("unused");
  }
  async fetchEvent(): Promise<ProviderEvent | null> {
    return null;
  }
  async fetchInstanceAt(): Promise<ProviderEvent | null> {
    return null;
  }
}

const tokenSource = () => ({
  getValidAccessToken: async () => "access-token",
  discardRevoked: async () => {},
  invalidateAccessToken: async () => {},
});

describe("retryStaleCommands", () => {
  let mongo: SyncMongoService;
  let commands: CommandRepository;
  let events: EventRepository;
  let occurrences: EventOccurrenceRepository;
  let calendars: ProviderCalendarRepository;
  let markers: DeletionMarkerRepository;

  const now = () => new Date("2026-07-10T00:00:00.000Z");
  // CommandRepository.submit() stamps createdAt/updatedAt with the real wall
  // clock (not the injected `now`), so a cutoff has to be relative to actual
  // Date.now() to correctly include/exclude a just-submitted command.
  const before = () => new Date(Date.now() + 60_000);
  const notYetStale = () => new Date(0);

  const schedule = {
    kind: "timed" as const,
    start: "2026-07-14T09:00:00-06:00",
    end: "2026-07-14T10:00:00-06:00",
    timeZone: "America/Denver",
  };

  // Seed a provider-linked event stuck deletionPending, plus its still-pending
  // delete command - the state a transient provider failure leaves behind
  // (executeProviderDelete's "return command" branch never writes to
  // storage, so the row is unchanged from submission).
  const seedStuckDelete = async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const connectionId = objectId() as ConnectionId;
    const calendar = await seedProviderCalendar(calendars, {
      tenantId,
      principalId,
      connectionId,
    });
    const eventId = objectId() as EventId;
    await events.put({
      _id: eventId,
      tenantId,
      principalId,
      origin: "compass",
      calendarId: calendar._id,
      clientEventId: null,
      connectionId,
      providerEventId: "g-evt-1" as never,
      providerVersion: "etag-1" as never,
      providerUpdatedAt: null,
      deliveryState: "confirmed",
      providerMetadata: null,
      content: {
        title: "Doomed",
        description: "",
        location: null,
        organizer: null,
        attendees: [],
        conference: null,
      },
      schedule,
      recurrence: { kind: "single" },
      // The state a transient failure leaves the event in: visibly
      // "deleting" until a retry finishes the job.
      lifecycleState: "deletionPending",
      generation: 0,
      createdAt: now(),
      updatedAt: now(),
      confirmedAt: now(),
    } as never);
    const event = await events.findById(tenantId, principalId, eventId);
    if (!event) throw new Error("seed failed to read back the event");
    const { record: command } = await commands.submit({
      tenantId,
      principalId,
      idempotencyKey: `idem-${objectId()}` as IdempotencyKey,
      eventId,
      input: { kind: "delete", invitation: "none", scope: "all" } as never,
      expectedVersion: null,
    });
    return { tenantId, principalId, calendar, event, command };
  };

  beforeEach(() => {
    mongo = storage.mongo();
    commands = new CommandRepository(mongo.db);
    events = new EventRepository(mongo.db);
    occurrences = new EventOccurrenceRepository(mongo.db, mongo.client);
    calendars = new ProviderCalendarRepository(mongo.db);
    markers = new DeletionMarkerRepository(mongo.db);
  });

  it("finishes a delete that failed transiently on the first attempt", async () => {
    const { tenantId, principalId, event, command } = await seedStuckDelete();
    expect(command.outcome.state).toBe("pending");
    const writer = new FakeDeleteWriter();

    const result = await retryStaleCommands(
      {
        commands,
        events,
        calendars,
        occurrences,
        markers,
        execution: "active",
        provider: { writer, custody: tokenSource() },
      },
      before(),
      now,
    );

    expect(result).toEqual({ attempted: 1, stillStale: 0 });
    expect(writer.deleteCalls).toHaveLength(1);
    const stored = await commands.findById(tenantId, principalId, command._id);
    expect(stored?.outcome.state).toBe("confirmed");
    expect(await events.findById(tenantId, principalId, event._id)).toBeNull();
  });

  it("leaves the command pending and reports it still stale on a repeated transient failure", async () => {
    const { tenantId, principalId, command } = await seedStuckDelete();
    const writer = new FakeDeleteWriter();
    writer.deleteError = new ProviderWriteError("transient", "blip again");

    const result = await retryStaleCommands(
      {
        commands,
        events,
        calendars,
        occurrences,
        markers,
        execution: "active",
        provider: { writer, custody: tokenSource() },
      },
      before(),
      now,
    );

    expect(result).toEqual({ attempted: 1, stillStale: 1 });
    const stored = await commands.findById(tenantId, principalId, command._id);
    expect(stored?.outcome.state).toBe("pending");
  });

  it("ignores commands newer than the stale cutoff", async () => {
    await seedStuckDelete();
    const writer = new FakeDeleteWriter();

    const result = await retryStaleCommands(
      {
        commands,
        events,
        calendars,
        occurrences,
        markers,
        execution: "active",
        provider: { writer, custody: tokenSource() },
      },
      // Cutoff before the command's updatedAt: not stale yet.
      notYetStale(),
      now,
    );

    expect(result).toEqual({ attempted: 0, stillStale: 0 });
    expect(writer.deleteCalls).toHaveLength(0);
  });

  it("counts a ProviderWriteUnavailableError as still-stale instead of throwing", async () => {
    await seedStuckDelete();
    const writer = new FakeDeleteWriter();

    const result = await retryStaleCommands(
      {
        commands,
        events,
        calendars,
        occurrences,
        markers,
        // Provider work unavailable: dispatchProviderDelete throws
        // ProviderWriteUnavailableError before ever calling the writer.
        execution: "passive",
        provider: { writer, custody: tokenSource() },
      },
      before(),
      now,
    );

    expect(result).toEqual({ attempted: 1, stillStale: 1 });
    expect(writer.deleteCalls).toHaveLength(0);
  });

  // Reproduces the 2026-07-31 failure class (one unparseable job doc froze
  // calendar sync fleet-wide for 23h) for THIS sweep: listStaleNonterminal
  // sorts oldest-updatedAt-first, so a command whose retry throws something
  // unexpected (not ProviderWriteUnavailableError) must not abort the batch -
  // every stale command behind it still needs its own attempt.
  it("keeps retrying later commands after an earlier one throws unexpectedly", async () => {
    const poisoned = await seedStuckDelete();
    const healthy = await seedStuckDelete();
    const writer = new FakeDeleteWriter();
    // listStaleNonterminal sorts oldest-updatedAt-first, so `poisoned` (seeded
    // first) is guaranteed to be attempted before `healthy` - throw only on
    // that first delete call to simulate the poisoned command specifically.
    const originalDeleteEvent = writer.deleteEvent.bind(writer);
    let calls = 0;
    writer.deleteEvent = async (input) => {
      calls++;
      if (calls === 1) throw new Error("unexpected: malformed row");
      return originalDeleteEvent(input);
    };

    const onRetryErrorCalls: Array<{ error: unknown; commandId: string }> = [];

    const result = await retryStaleCommands(
      {
        commands,
        events,
        calendars,
        occurrences,
        markers,
        execution: "active",
        provider: { writer, custody: tokenSource() },
        onRetryError: (error, commandId) =>
          onRetryErrorCalls.push({ error, commandId }),
      },
      before(),
      now,
    );

    expect(result).toEqual({ attempted: 2, stillStale: 1 });
    expect(onRetryErrorCalls).toHaveLength(1);
    expect(onRetryErrorCalls[0]?.commandId).toBe(poisoned.command._id);

    const poisonedStored = await commands.findById(
      poisoned.tenantId,
      poisoned.principalId,
      poisoned.command._id,
    );
    expect(poisonedStored?.outcome.state).toBe("pending");

    // The healthy command, seeded after the poisoned one and so sorted
    // behind it, still got its own attempt and converged.
    const healthyStored = await commands.findById(
      healthy.tenantId,
      healthy.principalId,
      healthy.command._id,
    );
    expect(healthyStored?.outcome.state).toBe("confirmed");
    expect(
      await events.findById(
        healthy.tenantId,
        healthy.principalId,
        healthy.event._id,
      ),
    ).toBeNull();
  });

  // Reproduces the exact data-loss scenario independent review flagged:
  // update A->B gets stuck pending (transient failure), the user edits again
  // B->C and that one succeeds, then the sweep later finds the stale A->B
  // command and must NOT reapply "B" over the already-current "C".
  it("fails a stale update as superseded instead of reapplying its stale content over a newer edit", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const eventId = objectId() as EventId;
    const calendarId = objectId();

    await events.put({
      _id: eventId,
      tenantId,
      principalId,
      origin: "compass",
      calendarId,
      clientEventId: null,
      connectionId: null,
      providerEventId: null,
      providerVersion: null,
      providerUpdatedAt: null,
      deliveryState: null,
      providerMetadata: null,
      content: {
        title: "A",
        description: "",
        location: null,
        organizer: null,
        attendees: [],
        conference: null,
      },
      schedule,
      recurrence: { kind: "single" },
      lifecycleState: "active",
      generation: 0,
      createdAt: now(),
      updatedAt: now(),
      confirmedAt: now(),
    } as never);

    const updateTo = (title: string) => ({
      tenantId,
      principalId,
      idempotencyKey: `idem-${objectId()}` as IdempotencyKey,
      eventId,
      input: {
        kind: "update",
        invitation: "none",
        content: {
          title,
          description: "",
          location: null,
          organizer: null,
          attendees: [],
          conference: null,
        },
        schedule,
        recurrence: { kind: "preserve" },
        scope: "all",
        recurrenceId: null,
      } as never,
      expectedVersion: null,
    });

    // Submit A->B but never apply it: this is exactly the state a transient
    // provider failure mid-execute leaves a command in (see
    // provider-command.service.ts's "return command" branches) - the row
    // stays pending, untouched, in storage.
    const { record: staleCommand } = await commands.submit(updateTo("B"));
    expect(staleCommand.outcome.state).toBe("pending");

    // The user's follow-up edit B->C is submitted and applied normally.
    const { command: laterCommand } = await submitCloudCommand(
      {
        commands,
        events,
        calendars,
        occurrences,
        markers,
        execution: "active",
        provider: { writer: new FakeDeleteWriter(), custody: tokenSource() },
      },
      updateTo("C"),
      now,
    );
    expect(laterCommand.outcome.state).toBe("confirmed");
    expect(
      (await events.findById(tenantId, principalId, eventId))?.content.title,
    ).toBe("C");

    const result = await retryStaleCommands(
      {
        commands,
        events,
        calendars,
        occurrences,
        markers,
        execution: "active",
        provider: { writer: new FakeDeleteWriter(), custody: tokenSource() },
      },
      before(),
      now,
    );

    expect(result).toEqual({ attempted: 1, stillStale: 0 });
    const staleStored = await commands.findById(
      tenantId,
      principalId,
      staleCommand._id,
    );
    expect(staleStored?.outcome.state).toBe("failed");
    expect(
      staleStored?.outcome.state === "failed" &&
        staleStored.outcome.failureReason,
    ).toBe("versionConflict");
    // The critical assertion: the event's title is still the LATER edit,
    // never reverted to the stale command's "B".
    expect(
      (await events.findById(tenantId, principalId, eventId))?.content.title,
    ).toBe("C");
  });
});
