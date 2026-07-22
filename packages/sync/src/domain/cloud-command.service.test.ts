import { faker } from "@faker-js/faker";
import { type SyncCommandInput } from "@core/types/sync/command.contracts";
import {
  type ConnectionId,
  type EventId,
  type IdempotencyKey,
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { submitCloudCommand } from "@sync/domain/cloud-command.service";
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
import { SyncMongoService } from "@sync/storage/sync-mongo.service";

const uri = process.env["SYNC_MONGO_URI"] as string;
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
  custody: { getValidAccessToken: async () => "access-token" },
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

  beforeEach(async () => {
    mongo = new SyncMongoService();
    await mongo.connect({
      uri,
      databaseName: `cloudcmd_${objectId()}`,
      forbiddenDatabaseName: "compass_api_unused",
      enforceLeastPrivilege: false,
    });
    commands = new CommandRepository(mongo.db);
    events = new EventRepository(mongo.db);
    occurrences = new EventOccurrenceRepository(mongo.db, mongo.client);
    calendars = new ProviderCalendarRepository(mongo.db);
    markers = new DeletionMarkerRepository(mongo.db);
  });

  afterEach(async () => {
    await mongo.db.dropDatabase();
    await mongo.disconnect();
  });

  it("executes a provider-targeted create when active and provider-capable", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const calendar = await seedProviderCalendar(tenantId, principalId);
    const writer = new FakeWriter();

    const command = await submitCloudCommand(
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

    const command = await submitCloudCommand(
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

    const command = await submitCloudCommand(
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

    const command = await submitCloudCommand(
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
  ): CommandSubmit => ({
    tenantId,
    principalId,
    idempotencyKey: `idem-${objectId()}` as IdempotencyKey,
    eventId,
    input: { kind: "delete", scope: "all" } as SyncCommandInput,
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

    const command = await submitCloudCommand(
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

  it("leaves a delete of a recurring series pending (scope handling)", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const eventId = objectId() as EventId;
    await seedEvent(tenantId, principalId, eventId, {
      recurrence: { kind: "seriesMaster", rules: ["RRULE:FREQ=WEEKLY"] },
    });

    const command = await submitCloudCommand(
      deps(),
      deleteFor(tenantId, principalId, eventId),
      now,
    );

    expect(command.outcome.state).toBe("pending");
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

    const command = await submitCloudCommand(
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

    const command = await submitCloudCommand(
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

    const command = await submitCloudCommand(deps(), submit, now);

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

    const command = await submitCloudCommand(deps(), update, now);

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

    const command = await submitCloudCommand(
      deps(),
      deleteFor(tenantId, principalId, submit.eventId),
      now,
    );

    expect(command.outcome.state).toBe("confirmed");
    expect(await occurrenceStartsFor(submit.eventId)).toHaveLength(0);
  });
});
