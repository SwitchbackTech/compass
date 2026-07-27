import { faker } from "@faker-js/faker";
import { type SyncCommandInput } from "@core/types/sync/command.contracts";
import {
  type ConnectionId,
  type EventId,
  type IdempotencyKey,
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { submitCloudCommand } from "@sync/domain/cloud-command.service";
import { reprojectOccurrences } from "@sync/domain/reproject";
import { type ProviderEvent } from "@sync/providers/provider-event.port";
import {
  type ProviderCreateInput,
  type ProviderEventWriter,
  type ProviderPatchInput,
  type ProviderWriteResult,
} from "@sync/providers/provider-event-writer.port";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { type CommandSubmit } from "@sync/storage/contracts/command.contracts";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";
import { CommandRepository } from "@sync/storage/repositories/command.repository";
import { DeletionMarkerRepository } from "@sync/storage/repositories/deletion-marker.repository";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { type SyncMongoService } from "@sync/storage/sync-mongo.service";
import { beforeEach, describe, expect, it, spyOn } from "bun:test";

const storage = setupSyncStorage(import.meta.url);
const objectId = () => faker.database.mongodbObjectId();

class FakeWriter implements ProviderEventWriter {
  readonly provider = "google" as const;
  calls: ProviderCreateInput[] = [];
  patchCalls: ProviderPatchInput[] = [];
  // A stub current provider event for the update path's replay-detection fetch;
  // its content differs from any command's intent so an update always patches.
  fetched: ProviderEvent | null = {
    kind: "event",
    providerEventId: "g-evt-1",
    providerVersion: "etag-1",
    providerUpdatedAt: null,
    content: {
      title: "Provider copy",
      description: "",
      location: null,
      organizer: null,
      attendees: [],
      conference: null,
    },
    schedule: {
      kind: "timed",
      start: "2026-07-14T09:00:00-06:00",
      end: "2026-07-14T10:00:00-06:00",
      timeZone: "America/Denver",
    },
    busy: true,
    recurrence: { kind: "single" },
  };
  async createEvent(input: ProviderCreateInput): Promise<ProviderWriteResult> {
    this.calls.push(input);
    return { providerEventId: "g-evt-1", providerVersion: "etag-1" };
  }
  async patchEvent(input: ProviderPatchInput): Promise<ProviderWriteResult> {
    this.patchCalls.push(input);
    return { providerEventId: "g-evt-1", providerVersion: "etag-2" };
  }
  deleteCalls = 0;
  async deleteEvent(): Promise<void> {
    this.deleteCalls++;
  }
  async fetchEvent(): Promise<ProviderEvent | null> {
    return this.fetched;
  }
}

const provider = (writer: ProviderEventWriter) => ({
  writer,
  custody: {
    getValidAccessToken: async () => "access-token",
    discardRevoked: async () => {},
  },
});

describe("submitCloudCommand provider dispatch", () => {
  let mongo: SyncMongoService;
  let commands: CommandRepository;
  let events: EventRepository;
  let occurrences: EventOccurrenceRepository;
  let calendars: ProviderCalendarRepository;
  let markers: DeletionMarkerRepository;

  const now = () => new Date("2026-07-10T00:00:00.000Z");

  const seedProviderCalendar = (tenantId: TenantId, principalId: PrincipalId) =>
    calendars.upsertByProviderCalendar({
      tenantId,
      principalId,
      connectionId: objectId() as ConnectionId,
      providerCalendarId: "primary@google.com",
      displayName: "Google",
      color: null,
      active: true,
      primary: true,
      accessRole: "owner",
      capabilities: {
        canReadEvents: true,
        canWriteEvents: true,
        canReadBusy: true,
        canInviteAttendees: true,
      },
    });

  const submitFor = (
    tenantId: TenantId,
    principalId: PrincipalId,
    calendarId: string,
  ): CommandSubmit => ({
    tenantId,
    principalId,
    idempotencyKey: `idem-${objectId()}` as IdempotencyKey,
    eventId: objectId() as EventId,
    input: {
      kind: "create",
      calendarId,
      invitation: "none",
      content: {
        title: "T",
        description: "",
        location: null,
        organizer: null,
        attendees: [],
        conference: null,
      },
      schedule: {
        kind: "timed",
        start: "2026-07-14T09:00:00-06:00",
        end: "2026-07-14T10:00:00-06:00",
        timeZone: "America/Denver",
      },
      recurrence: { kind: "single" },
    } as unknown as SyncCommandInput,
    expectedVersion: null,
  });

  beforeEach(() => {
    mongo = storage.mongo();
    commands = new CommandRepository(mongo.db);
    events = new EventRepository(mongo.db);
    occurrences = new EventOccurrenceRepository(mongo.db, mongo.client);
    calendars = new ProviderCalendarRepository(mongo.db);
    markers = new DeletionMarkerRepository(mongo.db);
  });

  it("executes a provider-targeted create when active and provider-capable", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const calendar = await seedProviderCalendar(tenantId, principalId);
    const writer = new FakeWriter();

    const { command } = await submitCloudCommand(
      {
        commands,
        events,
        calendars,
        occurrences,
        markers,
        execution: "active",
        provider: provider(writer),
      },
      submitFor(tenantId, principalId, calendar._id),
      now,
    );

    expect(command.outcome.state).toBe("confirmed");
    expect(writer.calls).toHaveLength(1);
  });

  it("leaves a provider-targeted create pending when passive", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const calendar = await seedProviderCalendar(tenantId, principalId);
    const writer = new FakeWriter();

    const { command } = await submitCloudCommand(
      {
        commands,
        events,
        calendars,
        occurrences,
        markers,
        execution: "passive",
        provider: provider(writer),
      },
      submitFor(tenantId, principalId, calendar._id),
      now,
    );

    expect(command.outcome.state).toBe("pending");
    expect(writer.calls).toHaveLength(0);
  });

  it("leaves a provider-targeted create pending when no provider is configured", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const calendar = await seedProviderCalendar(tenantId, principalId);

    const { command } = await submitCloudCommand(
      {
        commands,
        events,
        calendars,
        occurrences,
        markers,
        execution: "active",
      },
      submitFor(tenantId, principalId, calendar._id),
      now,
    );

    expect(command.outcome.state).toBe("pending");
  });

  it("still confirms a cloud (non-provider) create locally when active", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const writer = new FakeWriter();

    const { command } = await submitCloudCommand(
      {
        commands,
        events,
        calendars,
        occurrences,
        markers,
        execution: "active",
        provider: provider(writer),
      },
      // A calendar id with no provider_calendars row is a Compass cloud calendar.
      submitFor(tenantId, principalId, objectId()),
      now,
    );

    expect(command.outcome.state).toBe("confirmed");
    expect(writer.calls).toHaveLength(0);
  });

  // Seed an existing event to mutate. Overrides let a test make it
  // provider-linked or recurring to exercise the deferral guards.
  const seedEvent = (
    tenantId: TenantId,
    principalId: PrincipalId,
    eventId: EventId,
    overrides: Partial<EventRecord> = {},
  ) =>
    events.put({
      _id: eventId,
      tenantId,
      principalId,
      origin: "compass",
      calendarId: objectId(),
      clientEventId: null,
      connectionId: null,
      providerEventId: null,
      providerVersion: null,
      providerUpdatedAt: null,
      deliveryState: null,
      providerMetadata: null,
      content: {
        title: "Existing",
        description: "",
        location: null,
        organizer: null,
        attendees: [],
        conference: null,
      },
      schedule: {
        kind: "timed",
        start: "2026-07-14T09:00:00-06:00",
        end: "2026-07-14T10:00:00-06:00",
        timeZone: "America/Denver",
      },
      recurrence: { kind: "single" },
      lifecycleState: "active",
      generation: 0,
      createdAt: now(),
      updatedAt: now(),
      confirmedAt: now(),
      ...overrides,
    } as EventRecord);

  const deleteFor = (
    tenantId: TenantId,
    principalId: PrincipalId,
    eventId: EventId,
    scope = "all",
    recurrenceId: string | null = null,
  ): CommandSubmit => ({
    tenantId,
    principalId,
    idempotencyKey: `idem-${objectId()}` as IdempotencyKey,
    eventId,
    input: { kind: "delete", scope, recurrenceId } as SyncCommandInput,
    expectedVersion: null,
  });

  const deps = () => ({
    commands,
    events,
    calendars,
    occurrences,
    markers,
    execution: "passive" as const,
  });

  it("leaves a delete of a provider-linked event pending (provider path)", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const eventId = objectId() as EventId;
    await seedEvent(tenantId, principalId, eventId, {
      connectionId: objectId() as never,
      providerEventId: "g-evt-1" as never,
      providerVersion: "etag-1" as never,
      deliveryState: "confirmed",
    });

    const { command } = await submitCloudCommand(
      deps(),
      deleteFor(tenantId, principalId, eventId),
      now,
    );

    expect(command.outcome.state).toBe("pending");
    // The event is untouched — never delete a provider event without the
    // provider's confirmation.
    expect(
      await events.findById(tenantId, principalId, eventId),
    ).not.toBeNull();
  });

  it("routes a provider-linked update to the provider executor when active", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const calendar = await seedProviderCalendar(tenantId, principalId);
    const eventId = objectId() as EventId;
    await seedEvent(tenantId, principalId, eventId, {
      calendarId: calendar._id,
      connectionId: calendar.connectionId as never,
      providerEventId: "g-evt-1" as never,
      providerVersion: "etag-1" as never,
      deliveryState: "confirmed",
    });
    const writer = new FakeWriter();

    const { command } = await submitCloudCommand(
      {
        commands,
        events,
        calendars,
        occurrences,
        markers,
        execution: "active",
        provider: provider(writer),
      },
      {
        tenantId,
        principalId,
        idempotencyKey: `idem-${objectId()}` as IdempotencyKey,
        eventId,
        input: {
          kind: "update",
          invitation: "none",
          content: {
            title: "Renamed",
            description: "",
            location: null,
            organizer: null,
            attendees: [],
            conference: null,
          },
          schedule: {
            kind: "timed",
            start: "2026-07-14T09:00:00-06:00",
            end: "2026-07-14T10:00:00-06:00",
            timeZone: "America/Denver",
          },
          recurrence: { kind: "preserve" },
          scope: "all",
        } as unknown as SyncCommandInput,
        expectedVersion: "etag-1" as never,
      },
      now,
    );

    expect(command.outcome.state).toBe("confirmed");
    expect(writer.patchCalls).toHaveLength(1);
  });

  it("routes a provider-linked delete to the provider executor when active", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const calendar = await seedProviderCalendar(tenantId, principalId);
    const eventId = objectId() as EventId;
    await seedEvent(tenantId, principalId, eventId, {
      calendarId: calendar._id,
      connectionId: calendar.connectionId as never,
      providerEventId: "g-evt-1" as never,
      providerVersion: "etag-1" as never,
      deliveryState: "confirmed",
    });
    const writer = new FakeWriter();

    const { command } = await submitCloudCommand(
      {
        commands,
        events,
        calendars,
        occurrences,
        markers,
        execution: "active",
        provider: provider(writer),
      },
      deleteFor(tenantId, principalId, eventId),
      now,
    );

    expect(command.outcome.state).toBe("confirmed");
    expect(writer.deleteCalls).toBe(1);
    // Local content removed only after the provider confirmed.
    expect(await events.findById(tenantId, principalId, eventId)).toBeNull();
    expect(
      await markers.exists(
        calendar.connectionId,
        calendar._id,
        "g-evt-1" as never,
      ),
    ).toBe(true);
  });

  it("deletes a provider-linked series at the provider on an all-scope delete", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const calendar = await seedProviderCalendar(tenantId, principalId);
    const eventId = objectId() as EventId;
    await seedEvent(tenantId, principalId, eventId, {
      calendarId: calendar._id,
      connectionId: calendar.connectionId as never,
      providerEventId: "g-series-1" as never,
      providerVersion: "etag-1" as never,
      deliveryState: "confirmed",
      recurrence: { kind: "seriesMaster", rules: ["RRULE:FREQ=WEEKLY"] },
    });
    const writer = new FakeWriter();

    const { command } = await submitCloudCommand(
      {
        commands,
        events,
        calendars,
        occurrences,
        markers,
        execution: "active",
        provider: provider(writer),
      },
      deleteFor(tenantId, principalId, eventId, "all"),
      now,
    );

    expect(command.outcome.state).toBe("confirmed");
    expect(writer.deleteCalls).toBe(1);
    expect(await events.findById(tenantId, principalId, eventId)).toBeNull();
  });

  it("leaves a provider-linked series this-scope delete pending", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const calendar = await seedProviderCalendar(tenantId, principalId);
    const eventId = objectId() as EventId;
    await seedEvent(tenantId, principalId, eventId, {
      calendarId: calendar._id,
      connectionId: calendar.connectionId as never,
      providerEventId: "g-series-1" as never,
      providerVersion: "etag-1" as never,
      deliveryState: "confirmed",
      recurrence: { kind: "seriesMaster", rules: ["RRULE:FREQ=WEEKLY"] },
    });
    const writer = new FakeWriter();

    const { command } = await submitCloudCommand(
      {
        commands,
        events,
        calendars,
        occurrences,
        markers,
        execution: "active",
        provider: provider(writer),
      },
      deleteFor(
        tenantId,
        principalId,
        eventId,
        "this",
        "2026-07-21T09:00:00-06:00",
      ),
      now,
    );

    // Provider per-occurrence deletes need provider exception ops (deferred).
    expect(command.outcome.state).toBe("pending");
    expect(writer.deleteCalls).toBe(0);
    expect(
      await events.findById(tenantId, principalId, eventId),
    ).not.toBeNull();
  });

  const updateSeriesFor = (
    tenantId: TenantId,
    principalId: PrincipalId,
    eventId: EventId,
    scope: string,
    recurrenceId: string | null = null,
  ): CommandSubmit => ({
    tenantId,
    principalId,
    idempotencyKey: `idem-${objectId()}` as IdempotencyKey,
    eventId,
    input: {
      kind: "update",
      invitation: "none",
      content: {
        title: "Renamed series",
        description: "",
        location: null,
        organizer: null,
        attendees: [],
        conference: null,
      },
      schedule: {
        kind: "timed",
        start: "2026-07-14T09:00:00-06:00",
        end: "2026-07-14T10:00:00-06:00",
        timeZone: "America/Denver",
      },
      recurrence: { kind: "preserve" },
      scope,
      recurrenceId,
    } as unknown as SyncCommandInput,
    expectedVersion: "etag-1" as never,
  });

  it("routes a provider-linked series all-scope update to the provider executor", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const calendar = await seedProviderCalendar(tenantId, principalId);
    const eventId = objectId() as EventId;
    await seedEvent(tenantId, principalId, eventId, {
      calendarId: calendar._id,
      connectionId: calendar.connectionId as never,
      providerEventId: "g-series-1" as never,
      providerVersion: "etag-1" as never,
      deliveryState: "confirmed",
      recurrence: { kind: "seriesMaster", rules: ["RRULE:FREQ=WEEKLY"] },
    });
    const writer = new FakeWriter();

    const { command } = await submitCloudCommand(
      {
        commands,
        events,
        calendars,
        occurrences,
        markers,
        execution: "active",
        provider: provider(writer),
      },
      updateSeriesFor(tenantId, principalId, eventId, "all"),
      now,
    );

    expect(command.outcome.state).toBe("confirmed");
    expect(writer.patchCalls).toHaveLength(1);
  });

  it("leaves a provider-linked series this-scope update pending", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const calendar = await seedProviderCalendar(tenantId, principalId);
    const eventId = objectId() as EventId;
    await seedEvent(tenantId, principalId, eventId, {
      calendarId: calendar._id,
      connectionId: calendar.connectionId as never,
      providerEventId: "g-series-1" as never,
      providerVersion: "etag-1" as never,
      deliveryState: "confirmed",
      recurrence: { kind: "seriesMaster", rules: ["RRULE:FREQ=WEEKLY"] },
    });
    const writer = new FakeWriter();

    const { command } = await submitCloudCommand(
      {
        commands,
        events,
        calendars,
        occurrences,
        markers,
        execution: "active",
        provider: provider(writer),
      },
      updateSeriesFor(
        tenantId,
        principalId,
        eventId,
        "this",
        "2026-07-21T09:00:00-06:00",
      ),
      now,
    );

    // Provider per-occurrence edits need provider exception ops (deferred).
    expect(command.outcome.state).toBe("pending");
    expect(writer.patchCalls).toHaveLength(0);
    expect(
      await events.findById(tenantId, principalId, eventId),
    ).not.toBeNull();
  });

  // The occurrence projection is the read model, so a cloud command must leave
  // it consistent with the event it just wrote.
  const occurrenceStartsFor = async (eventId: EventId): Promise<string[]> => {
    const docs = await mongo.db
      .collection(SYNC_COLLECTIONS.eventOccurrences)
      .find({ eventId })
      .sort({ startAt: 1 })
      .toArray();
    return docs.map((doc) => (doc["startAt"] as Date).toISOString());
  };

  it("projects the occurrence for a cloud single create", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const submit = submitFor(tenantId, principalId, objectId());

    const { command } = await submitCloudCommand(deps(), submit, now);

    expect(command.outcome.state).toBe("confirmed");
    expect(await occurrenceStartsFor(submit.eventId)).toEqual([
      "2026-07-14T15:00:00.000Z",
    ]);
  });

  it("projects every occurrence for a cloud series create", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const submit = submitFor(tenantId, principalId, objectId());
    (submit.input as { recurrence: unknown }).recurrence = {
      kind: "series",
      rules: ["RRULE:FREQ=WEEKLY;COUNT=3"],
    };

    await submitCloudCommand(deps(), submit, now);

    expect(await occurrenceStartsFor(submit.eventId)).toEqual([
      "2026-07-14T15:00:00.000Z",
      "2026-07-21T15:00:00.000Z",
      "2026-07-28T15:00:00.000Z",
    ]);
  });

  it("reprojects occurrences when a cloud event is updated", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const eventId = objectId() as EventId;
    await seedEvent(tenantId, principalId, eventId);

    const update: CommandSubmit = {
      tenantId,
      principalId,
      idempotencyKey: `idem-${objectId()}` as IdempotencyKey,
      eventId,
      input: {
        kind: "update",
        invitation: "none",
        content: {
          title: "Moved",
          description: "",
          location: null,
          organizer: null,
          attendees: [],
          conference: null,
        },
        schedule: {
          kind: "timed",
          start: "2026-07-15T11:00:00-06:00",
          end: "2026-07-15T12:00:00-06:00",
          timeZone: "America/Denver",
        },
        recurrence: { kind: "preserve" },
        scope: "this",
      } as unknown as SyncCommandInput,
      expectedVersion: null,
    };

    const { command } = await submitCloudCommand(deps(), update, now);

    expect(command.outcome.state).toBe("confirmed");
    expect(await occurrenceStartsFor(eventId)).toEqual([
      "2026-07-15T17:00:00.000Z",
    ]);
  });

  it("clears occurrences when a cloud event is deleted", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const submit = submitFor(tenantId, principalId, objectId());
    await submitCloudCommand(deps(), submit, now);
    expect(await occurrenceStartsFor(submit.eventId)).toHaveLength(1);

    const { command } = await submitCloudCommand(
      deps(),
      deleteFor(tenantId, principalId, submit.eventId),
      now,
    );

    expect(command.outcome.state).toBe("confirmed");
    expect(await occurrenceStartsFor(submit.eventId)).toHaveLength(0);
  });

  it("clears occurrences before deleting the event so a crash cannot orphan them", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const submit = submitFor(tenantId, principalId, objectId());
    await submitCloudCommand(deps(), submit, now);

    // If the delete landed before the clear, a crash in between would leave the
    // event gone but its occurrences orphaned — and the retry's `!existing`
    // branch confirms without ever clearing them. Lock in the clear-first order.
    const order: string[] = [];
    const realClear = occurrences.replaceForEvent.bind(occurrences);
    const realDelete = events.deleteById.bind(events);
    spyOn(occurrences, "replaceForEvent").mockImplementation(
      async (...args) => {
        order.push("clear");
        return realClear(...args);
      },
    );
    spyOn(events, "deleteById").mockImplementation(async (...args) => {
      order.push("delete");
      return realDelete(...args);
    });

    await submitCloudCommand(
      deps(),
      deleteFor(tenantId, principalId, submit.eventId),
      now,
    );

    expect(order).toEqual(["clear", "delete"]);
  });

  const seriesMaster = (
    tenantId: TenantId,
    principalId: PrincipalId,
    eventId: EventId,
    overrides: Partial<EventRecord> = {},
  ) =>
    seedEvent(tenantId, principalId, eventId, {
      recurrence: {
        kind: "seriesMaster",
        rules: ["RRULE:FREQ=WEEKLY;COUNT=3"],
      },
      ...overrides,
    });

  const seriesException = (
    tenantId: TenantId,
    principalId: PrincipalId,
    seriesId: EventId,
    recurrenceId: string,
    cancelled = false,
  ) =>
    seedEvent(tenantId, principalId, objectId() as EventId, {
      recurrence: {
        kind: "exception",
        seriesId,
        recurrenceId: recurrenceId as never,
        cancelled,
      },
      schedule: {
        kind: "timed",
        start: recurrenceId,
        // A valid end on the same day as the instance (09:00 starts -> 23:00).
        end: recurrenceId.replace(/T\d{2}:/, "T23:"),
        timeZone: "America/Denver",
      } as never,
    });

  const updateAllFor = (
    tenantId: TenantId,
    principalId: PrincipalId,
    eventId: EventId,
    title: string,
    recurrence: unknown = { kind: "preserve" },
  ): CommandSubmit => ({
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
      schedule: {
        kind: "timed",
        start: "2026-07-14T09:00:00-06:00",
        end: "2026-07-14T10:00:00-06:00",
        timeZone: "America/Denver",
      },
      recurrence,
      scope: "all",
    } as unknown as SyncCommandInput,
    expectedVersion: null,
  });

  it("deletes a whole cloud series and clears all its occurrences (scope all)", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const masterId = objectId() as EventId;
    const excepted = "2026-07-21T09:00:00-06:00";
    const master = await seriesMaster(tenantId, principalId, masterId);
    const exception = await seriesException(
      tenantId,
      principalId,
      masterId,
      excepted,
    );
    await reprojectOccurrences(occurrences, master, now, [excepted as never]);
    await reprojectOccurrences(occurrences, exception, now);
    expect((await occurrenceStartsFor(masterId)).length).toBeGreaterThan(0);
    expect(await occurrenceStartsFor(exception._id)).toHaveLength(1);

    const { command } = await submitCloudCommand(
      deps(),
      deleteFor(tenantId, principalId, masterId),
      now,
    );

    expect(command.outcome.state).toBe("confirmed");
    expect(await events.findById(tenantId, principalId, masterId)).toBeNull();
    expect(
      await events.findById(tenantId, principalId, exception._id),
    ).toBeNull();
    expect(await occurrenceStartsFor(masterId)).toHaveLength(0);
    expect(await occurrenceStartsFor(exception._id)).toHaveLength(0);
  });

  it("edits a whole cloud series, drops its exceptions, and reprojects (scope all)", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const masterId = objectId() as EventId;
    const excepted = "2026-07-21T09:00:00-06:00";
    const master = await seriesMaster(tenantId, principalId, masterId);
    const exception = await seriesException(
      tenantId,
      principalId,
      masterId,
      excepted,
    );
    await reprojectOccurrences(occurrences, master, now, [excepted as never]);
    await reprojectOccurrences(occurrences, exception, now);

    const { command } = await submitCloudCommand(
      deps(),
      updateAllFor(tenantId, principalId, masterId, "Renamed"),
      now,
    );

    expect(command.outcome.state).toBe("confirmed");
    const updated = await events.findById(tenantId, principalId, masterId);
    expect(updated?.content.title).toBe("Renamed");
    // The exception is discarded and the master now owns every instant again.
    expect(
      await events.findById(tenantId, principalId, exception._id),
    ).toBeNull();
    expect(await occurrenceStartsFor(exception._id)).toHaveLength(0);
    const starts = await occurrenceStartsFor(masterId);
    expect(starts).toContain("2026-07-21T15:00:00.000Z");
    expect(starts).toHaveLength(3);
  });

  it("preserves a cancelled occurrence across an edit-all (no resurrection)", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const masterId = objectId() as EventId;
    const cancelledInstant = "2026-07-21T09:00:00-06:00";
    const master = await seriesMaster(tenantId, principalId, masterId);
    // The user deleted this one occurrence (scope "this" tombstone).
    const tombstone = await seriesException(
      tenantId,
      principalId,
      masterId,
      cancelledInstant,
      true,
    );
    await reprojectOccurrences(occurrences, master, now, [
      cancelledInstant as never,
    ]);
    await reprojectOccurrences(occurrences, tombstone, now);

    const { command } = await submitCloudCommand(
      deps(),
      updateAllFor(tenantId, principalId, masterId, "Renamed"),
      now,
    );

    expect(command.outcome.state).toBe("confirmed");
    // The tombstone survives, so the deleted instant is still not a live
    // occurrence of the master.
    expect(
      await events.findById(tenantId, principalId, tombstone._id),
    ).not.toBeNull();
    const starts = await occurrenceStartsFor(masterId);
    expect(starts).not.toContain("2026-07-21T15:00:00.000Z");
    expect(starts).toHaveLength(2);
  });

  it("converts a series to a single event on edit-all and still drops exceptions", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const masterId = objectId() as EventId;
    const excepted = "2026-07-21T09:00:00-06:00";
    const master = await seriesMaster(tenantId, principalId, masterId);
    const exception = await seriesException(
      tenantId,
      principalId,
      masterId,
      excepted,
    );
    await reprojectOccurrences(occurrences, master, now, [excepted as never]);
    await reprojectOccurrences(occurrences, exception, now);

    const { command } = await submitCloudCommand(
      deps(),
      updateAllFor(tenantId, principalId, masterId, "Now single", {
        kind: "single",
      }),
      now,
    );

    expect(command.outcome.state).toBe("confirmed");
    const updated = await events.findById(tenantId, principalId, masterId);
    expect(updated?.recurrence.kind).toBe("single");
    // The exceptions are gone even though the master is no longer a series.
    expect(
      await events.findById(tenantId, principalId, exception._id),
    ).toBeNull();
    expect(await occurrenceStartsFor(exception._id)).toHaveLength(0);
    // A single event projects exactly one occurrence.
    expect(await occurrenceStartsFor(masterId)).toHaveLength(1);
  });

  it("leaves an all-scope delete of a provider-linked series pending", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const masterId = objectId() as EventId;
    await seriesMaster(tenantId, principalId, masterId, {
      connectionId: objectId() as never,
      providerEventId: "g-series-1" as never,
      providerVersion: "etag-1" as never,
      deliveryState: "confirmed",
    });

    const { command } = await submitCloudCommand(
      deps(),
      deleteFor(tenantId, principalId, masterId),
      now,
    );

    expect(command.outcome.state).toBe("pending");
    expect(
      await events.findById(tenantId, principalId, masterId),
    ).not.toBeNull();
  });

  const updateThisFor = (
    tenantId: TenantId,
    principalId: PrincipalId,
    eventId: EventId,
    recurrenceId: string,
    title: string,
  ): CommandSubmit => ({
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
      schedule: {
        kind: "timed",
        start: "2026-07-21T11:00:00-06:00",
        end: "2026-07-21T12:00:00-06:00",
        timeZone: "America/Denver",
      },
      recurrence: { kind: "preserve" },
      scope: "this",
      recurrenceId,
    } as unknown as SyncCommandInput,
    expectedVersion: null,
  });

  const EXCEPTED = "2026-07-21T09:00:00-06:00";
  const EXCEPTED_START = "2026-07-21T15:00:00.000Z";

  it("cancels one occurrence of a cloud series with scope this", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const masterId = objectId() as EventId;
    const master = await seriesMaster(tenantId, principalId, masterId);
    await reprojectOccurrences(occurrences, master, now);
    expect(await occurrenceStartsFor(masterId)).toHaveLength(3);

    const { command } = await submitCloudCommand(
      deps(),
      deleteFor(tenantId, principalId, masterId, "this", EXCEPTED),
      now,
    );

    expect(command.outcome.state).toBe("confirmed");
    const starts = await occurrenceStartsFor(masterId);
    expect(starts).not.toContain(EXCEPTED_START);
    expect(starts).toHaveLength(2);
    const exceptions = await events.findSeriesExceptions(
      tenantId,
      principalId,
      masterId,
    );
    expect(exceptions).toHaveLength(1);
    const only = exceptions[0];
    expect(
      only?.recurrence.kind === "exception" && only.recurrence.cancelled,
    ).toBe(true);
  });

  it("overrides one occurrence of a cloud series with scope this", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const masterId = objectId() as EventId;
    const master = await seriesMaster(tenantId, principalId, masterId);
    await reprojectOccurrences(occurrences, master, now);

    const { command } = await submitCloudCommand(
      deps(),
      updateThisFor(tenantId, principalId, masterId, EXCEPTED, "Moved"),
      now,
    );

    expect(command.outcome.state).toBe("confirmed");
    const exceptions = await events.findSeriesExceptions(
      tenantId,
      principalId,
      masterId,
    );
    expect(exceptions).toHaveLength(1);
    const only = exceptions[0];
    expect(only?.content.title).toBe("Moved");
    expect(
      only?.recurrence.kind === "exception" && !only.recurrence.cancelled,
    ).toBe(true);
    // The master no longer owns the instant; the override occurrence does.
    const masterStarts = await occurrenceStartsFor(masterId);
    expect(masterStarts).not.toContain(EXCEPTED_START);
    expect(masterStarts).toHaveLength(2);
    if (only) {
      expect(await occurrenceStartsFor(only._id)).toHaveLength(1);
    }
  });

  it("upserts a single exception across two deletes of the same occurrence", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const masterId = objectId() as EventId;
    const master = await seriesMaster(tenantId, principalId, masterId);
    await reprojectOccurrences(occurrences, master, now);

    // Two distinct commands (fresh idempotency keys) targeting one instant.
    await submitCloudCommand(
      deps(),
      deleteFor(tenantId, principalId, masterId, "this", EXCEPTED),
      now,
    );
    await submitCloudCommand(
      deps(),
      deleteFor(tenantId, principalId, masterId, "this", EXCEPTED),
      now,
    );

    const exceptions = await events.findSeriesExceptions(
      tenantId,
      principalId,
      masterId,
    );
    expect(exceptions).toHaveLength(1);
  });

  it("deletes this and following occurrences of a cloud series", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const masterId = objectId() as EventId;
    // Weekly x3 from 2026-07-14: 07-14, 07-21, 07-28 (all 09:00-06 = 15:00Z).
    const master = await seriesMaster(tenantId, principalId, masterId);
    // An override on the last occurrence — it is at/after the split, so it goes.
    const following = await seriesException(
      tenantId,
      principalId,
      masterId,
      "2026-07-28T09:00:00-06:00",
    );
    await reprojectOccurrences(occurrences, master, now, [
      "2026-07-28T09:00:00-06:00" as never,
    ]);
    await reprojectOccurrences(occurrences, following, now);

    const { command } = await submitCloudCommand(
      deps(),
      deleteFor(tenantId, principalId, masterId, "thisAndFollowing", EXCEPTED),
      now,
    );

    expect(command.outcome.state).toBe("confirmed");
    // Only the occurrence before the split survives.
    expect(await occurrenceStartsFor(masterId)).toEqual([
      "2026-07-14T15:00:00.000Z",
    ]);
    // The following exception is gone.
    expect(
      await events.findById(tenantId, principalId, following._id),
    ).toBeNull();
  });

  const splitFor = (
    tenantId: TenantId,
    principalId: PrincipalId,
    eventId: EventId,
    recurrenceId: string,
    title: string,
  ): CommandSubmit => ({
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
      schedule: {
        kind: "timed",
        start: "2026-07-21T09:00:00-06:00",
        end: "2026-07-21T10:00:00-06:00",
        timeZone: "America/Denver",
      },
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=2"] },
      scope: "thisAndFollowing",
      recurrenceId,
    } as unknown as SyncCommandInput,
    expectedVersion: null,
  });

  const otherSeriesMaster = (principalId: PrincipalId, masterId: EventId) =>
    mongo.db
      .collection(SYNC_COLLECTIONS.events)
      .find({
        principalId,
        "recurrence.kind": "seriesMaster",
        _id: { $ne: masterId },
      })
      .toArray();

  it("splits a cloud series into a truncated original and an edited remainder", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const masterId = objectId() as EventId;
    const master = await seriesMaster(tenantId, principalId, masterId);
    // An override after the split — superseded by the new series, so dropped.
    const following = await seriesException(
      tenantId,
      principalId,
      masterId,
      "2026-07-28T09:00:00-06:00",
    );
    await reprojectOccurrences(occurrences, master, now, [
      "2026-07-28T09:00:00-06:00" as never,
    ]);
    await reprojectOccurrences(occurrences, following, now);

    const { command } = await submitCloudCommand(
      deps(),
      splitFor(tenantId, principalId, masterId, EXCEPTED, "Split"),
      now,
    );

    expect(command.outcome.state).toBe("confirmed");
    // The original keeps only the pre-split occurrence, with its old title.
    const original = await events.findById(tenantId, principalId, masterId);
    expect(original?.content.title).toBe("Existing");
    expect(await occurrenceStartsFor(masterId)).toEqual([
      "2026-07-14T15:00:00.000Z",
    ]);
    // The following exception is gone.
    expect(
      await events.findById(tenantId, principalId, following._id),
    ).toBeNull();
    // A remainder series carries the edit from the split point on.
    const remainders = await otherSeriesMaster(principalId, masterId);
    expect(remainders).toHaveLength(1);
    const remainder = remainders[0];
    expect(remainder?.["content"]).toMatchObject({ title: "Split" });
    expect(await occurrenceStartsFor(remainder?.["_id"] as EventId)).toEqual([
      "2026-07-21T15:00:00.000Z",
      "2026-07-28T15:00:00.000Z",
    ]);
  });

  it("upserts a single remainder master across two splits at the same point", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const masterId = objectId() as EventId;
    const master = await seriesMaster(tenantId, principalId, masterId);
    await reprojectOccurrences(occurrences, master, now);

    // Two distinct commands (fresh idempotency keys) splitting at one point.
    await submitCloudCommand(
      deps(),
      splitFor(tenantId, principalId, masterId, EXCEPTED, "First"),
      now,
    );
    await submitCloudCommand(
      deps(),
      splitFor(tenantId, principalId, masterId, EXCEPTED, "Second"),
      now,
    );

    // The deterministic remainder id means one remainder, not two.
    expect(await otherSeriesMaster(principalId, masterId)).toHaveLength(1);
  });

  it("collapses a thisAndFollowing edit at the first occurrence to editing the whole series", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const masterId = objectId() as EventId;
    const master = await seriesMaster(tenantId, principalId, masterId);
    await reprojectOccurrences(occurrences, master, now);

    const { command } = await submitCloudCommand(
      deps(),
      splitFor(
        tenantId,
        principalId,
        masterId,
        "2026-07-14T09:00:00-06:00",
        "Whole",
      ),
      now,
    );

    expect(command.outcome.state).toBe("confirmed");
    // Edited in place — no separate remainder series was created.
    const original = await events.findById(tenantId, principalId, masterId);
    expect(original?.content.title).toBe("Whole");
    expect(await otherSeriesMaster(principalId, masterId)).toHaveLength(0);
  });

  it("collapses thisAndFollowing at the first occurrence to deleting the whole series", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const masterId = objectId() as EventId;
    const master = await seriesMaster(tenantId, principalId, masterId);
    await reprojectOccurrences(occurrences, master, now);

    const { command } = await submitCloudCommand(
      deps(),
      // The split point is the series' own first occurrence.
      deleteFor(
        tenantId,
        principalId,
        masterId,
        "thisAndFollowing",
        "2026-07-14T09:00:00-06:00",
      ),
      now,
    );

    expect(command.outcome.state).toBe("confirmed");
    expect(await events.findById(tenantId, principalId, masterId)).toBeNull();
    expect(await occurrenceStartsFor(masterId)).toHaveLength(0);
  });
});
