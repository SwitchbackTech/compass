import { faker } from "@faker-js/faker";
import { type RecurrenceEdit } from "@core/types/event-command.contracts";
import { type SyncCommandInput } from "@core/types/sync/command.contracts";
import {
  type ConnectionId,
  type EventId,
  type IdempotencyKey,
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { CredentialCustody } from "@sync/credentials/credential-custody.service";
import { truncateRulesBefore } from "@sync/domain/occurrence-projection";
import {
  type AccessTokenSource,
  executeProviderCreate,
  executeProviderDelete,
  executeProviderOccurrenceDelete,
  executeProviderOccurrenceUpdate,
  executeProviderSeriesFollowingDelete,
  executeProviderSeriesFollowingUpdate,
  executeProviderSeriesUpdate,
  executeProviderUpdate,
} from "@sync/domain/provider-command.service";
import { reprojectOccurrences } from "@sync/domain/reproject";
import {
  type ProviderAuthAdapter,
  ProviderAuthError,
  type RefreshedCredential,
} from "@sync/providers/provider-auth.port";
import { type ProviderEvent } from "@sync/providers/provider-event.port";
import {
  type ProviderCreateInput,
  type ProviderDeleteInput,
  type ProviderEventWriter,
  type ProviderFetchInput,
  type ProviderInstanceFetchInput,
  type ProviderPatchInput,
  ProviderWriteError,
  type ProviderWriteResult,
} from "@sync/providers/provider-event-writer.port";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";
import { type ProviderCalendarRecord } from "@sync/storage/contracts/provider-calendar.contracts";
import { CommandRepository } from "@sync/storage/repositories/command.repository";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { DeletionMarkerRepository } from "@sync/storage/repositories/deletion-marker.repository";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { type SyncMongoService } from "@sync/storage/sync-mongo.service";

const storage = setupSyncStorage(import.meta.url);
const objectId = () => faker.database.mongodbObjectId();

// A writer that records its calls and returns a fixed identity, or throws a
// preset error. No network.
class FakeWriter implements ProviderEventWriter {
  readonly provider = "google" as const;
  calls: ProviderCreateInput[] = [];
  result: ProviderWriteResult = {
    providerEventId: "g-evt-1",
    providerVersion: "etag-1",
  };
  error?: unknown;
  async createEvent(input: ProviderCreateInput): Promise<ProviderWriteResult> {
    this.calls.push(input);
    if (this.error) throw this.error;
    return this.result;
  }
  patchEvent(): Promise<ProviderWriteResult> {
    throw new Error("unused");
  }
  deleteEvent(): Promise<void> {
    throw new Error("unused");
  }
  fetchEvent(): Promise<null> {
    throw new Error("unused");
  }
}

const tokenSource = (token = "access-token"): AccessTokenSource => ({
  getValidAccessToken: async () => token,
  discardRevoked: async () => {},
});
const failingTokenSource = (error: unknown): AccessTokenSource => ({
  getValidAccessToken: async () => {
    throw error;
  },
  discardRevoked: async () => {},
});

// Minimal auth adapter for CredentialCustody in the revoked-grant cases.
class RevokedAuthAdapter implements ProviderAuthAdapter {
  readonly provider = "google" as const;
  constructor(
    private readonly behavior: {
      refreshError?: unknown;
      refreshed?: RefreshedCredential;
    } = {},
  ) {}
  buildAuthorizationUrl(): string {
    throw new Error("not used");
  }
  exchangeAuthorizationCode(): Promise<never> {
    throw new Error("not used");
  }
  async refreshAccessToken(): Promise<RefreshedCredential> {
    if (this.behavior.refreshError) throw this.behavior.refreshError;
    return (
      this.behavior.refreshed ?? {
        accessToken: "refreshed",
        expiresAt: new Date("2099-01-01T00:00:00Z"),
        grantedScopes: [],
      }
    );
  }
  async revoke(): Promise<void> {}
}

const storeCredential = async (
  credentials: CredentialRepository,
  connectionId: ConnectionId,
  accessToken?: { token: string; expiresAt: Date },
) => {
  await credentials.store({
    connectionId,
    provider: "google",
    refreshToken: "stored-refresh-token",
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
  });
  if (accessToken) {
    await credentials.cacheAccessToken(
      connectionId,
      accessToken.token,
      accessToken.expiresAt,
    );
  }
};

describe("executeProviderCreate", () => {
  let mongo: SyncMongoService;
  let commands: CommandRepository;
  let events: EventRepository;
  let occurrences: EventOccurrenceRepository;
  let calendars: ProviderCalendarRepository;

  const createInput = (
    calendarId: string,
    invitation = "none",
  ): SyncCommandInput =>
    ({
      kind: "create",
      calendarId,
      invitation,
      content: {
        title: "Sync me",
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
    }) as unknown as SyncCommandInput;

  // Seed a pending create command plus its target provider calendar, and return
  // both with the fake dependencies wired up.
  const seed = async (invitation = "none") => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const connectionId = objectId() as ConnectionId;
    const calendar: ProviderCalendarRecord =
      await calendars.upsertByProviderCalendar({
        tenantId,
        principalId,
        connectionId,
        providerCalendarId: "primary@group.calendar.google.com",
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
    const { record: command } = await commands.submit({
      tenantId,
      principalId,
      idempotencyKey: `idem-${objectId()}` as IdempotencyKey,
      eventId: objectId() as EventId,
      input: createInput(calendar._id, invitation),
      expectedVersion: null,
    });
    return { tenantId, principalId, calendar, command };
  };

  beforeEach(() => {
    mongo = storage.mongo();
    commands = new CommandRepository(mongo.db);
    events = new EventRepository(mongo.db);
    occurrences = new EventOccurrenceRepository(mongo.db, mongo.client);
    calendars = new ProviderCalendarRepository(mongo.db);
  });

  const now = () => new Date("2026-07-10T00:00:00.000Z");

  it("writes to the provider, commits its identity, and confirms", async () => {
    const { tenantId, principalId, calendar, command } = await seed();
    const writer = new FakeWriter();

    const result = await executeProviderCreate(
      { commands, events, occurrences, writer, custody: tokenSource() },
      command,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    expect(
      result.outcome.state === "confirmed" && result.outcome.providerEventId,
    ).toBe("g-evt-1");

    // Called with the raw provider calendar id and the deterministic event id.
    expect(writer.calls).toHaveLength(1);
    expect(writer.calls[0].calendarId).toBe(calendar.providerCalendarId);
    expect(writer.calls[0].providerEventId).toBe(command.eventId);

    const stored = await events.findById(
      tenantId,
      principalId,
      command.eventId,
    );
    expect(stored?.connectionId).toBe(calendar.connectionId);
    expect(stored?.providerEventId).toBe("g-evt-1");
    expect(stored?.providerVersion).toBe("etag-1");
    expect(stored?.deliveryState).toBe("confirmed");

    // The provider-linked event is projected into the read model.
    const occ = await mongo.db
      .collection(SYNC_COLLECTIONS.eventOccurrences)
      .find({ eventId: command.eventId })
      .toArray();
    expect(occ.map((o) => (o["startAt"] as Date).toISOString())).toEqual([
      "2026-07-14T15:00:00.000Z",
    ]);
  });

  it("passes the caller's invitation intent through to the writer", async () => {
    const { calendar, command } = await seed("all");
    const writer = new FakeWriter();

    await executeProviderCreate(
      { commands, events, occurrences, writer, custody: tokenSource() },
      command,
      calendar,
      now,
    );

    expect(writer.calls[0].invitation).toBe("all");
  });

  it("converges on one event when executed twice (idempotent write)", async () => {
    const { tenantId, principalId, calendar, command } = await seed();
    const writer = new FakeWriter();
    const deps = {
      commands,
      events,
      occurrences,
      writer,
      custody: tokenSource(),
    };

    await executeProviderCreate(deps, command, calendar, now);
    await executeProviderCreate(deps, command, calendar, now);

    const owned = await events.listByCalendar({
      tenantId,
      principalId,
      calendarId: calendar._id,
      generation: 0,
      limit: 10,
    });
    expect(owned).toHaveLength(1);
  });

  it("leaves the command pending on a transient write failure", async () => {
    const { tenantId, principalId, calendar, command } = await seed();
    const writer = new FakeWriter();
    writer.error = new ProviderWriteError("transient", "network blip");

    const result = await executeProviderCreate(
      { commands, events, occurrences, writer, custody: tokenSource() },
      command,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("pending");
    expect(
      await events.findById(tenantId, principalId, command.eventId),
    ).toBeNull();
  });

  it("fails the command on a terminal write error", async () => {
    const { tenantId, principalId, calendar, command } = await seed();
    const writer = new FakeWriter();
    writer.error = new ProviderWriteError("readOnlyCalendar", "read only");

    const result = await executeProviderCreate(
      { commands, events, occurrences, writer, custody: tokenSource() },
      command,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("failed");
    expect(
      result.outcome.state === "failed" && result.outcome.failureReason,
    ).toBe("readOnlyCalendar");
    expect(
      await events.findById(tenantId, principalId, command.eventId),
    ).toBeNull();
  });

  it("fails the command when the credential is revoked, without writing", async () => {
    const { calendar, command } = await seed();
    const writer = new FakeWriter();
    const credentials = new CredentialRepository(mongo.db);
    await storeCredential(credentials, calendar.connectionId);
    const custody = new CredentialCustody(
      credentials,
      new RevokedAuthAdapter({
        refreshError: new ProviderAuthError("authorizationRevoked", "revoked"),
      }),
    );

    const result = await executeProviderCreate(
      {
        commands,
        events,
        occurrences,
        writer,
        custody,
      },
      command,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("failed");
    expect(
      result.outcome.state === "failed" && result.outcome.failureReason,
    ).toBe("authorizationRevoked");
    expect(writer.calls).toHaveLength(0);
    expect(
      await credentials.findByConnection(calendar.connectionId),
    ).toBeNull();
  });

  it("leaves the command pending on a transient refresh failure", async () => {
    const { calendar, command } = await seed();
    const writer = new FakeWriter();

    const result = await executeProviderCreate(
      {
        commands,
        events,
        occurrences,
        writer,
        custody: failingTokenSource(
          new ProviderAuthError("refreshFailed", "temporary"),
        ),
      },
      command,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("pending");
    expect(writer.calls).toHaveLength(0);
  });
});

// A writer for the update path: configurable fetchEvent (replay detection) and
// patchEvent (conditional write) results/errors, recording their inputs.
class FakeUpdateWriter implements ProviderEventWriter {
  readonly provider = "google" as const;
  fetched: ProviderEvent | null = null;
  fetchError?: unknown;
  patchResult: ProviderWriteResult = {
    providerEventId: "g-evt-1",
    providerVersion: "etag-2",
  };
  patchError?: unknown;
  fetchCalls: ProviderFetchInput[] = [];
  patchCalls: ProviderPatchInput[] = [];
  createEvent(): Promise<ProviderWriteResult> {
    throw new Error("unused");
  }
  async patchEvent(input: ProviderPatchInput): Promise<ProviderWriteResult> {
    this.patchCalls.push(input);
    if (this.patchError) throw this.patchError;
    return this.patchResult;
  }
  deleteEvent(): Promise<void> {
    throw new Error("unused");
  }
  async fetchEvent(input: ProviderFetchInput): Promise<ProviderEvent | null> {
    this.fetchCalls.push(input);
    if (this.fetchError) throw this.fetchError;
    return this.fetched;
  }
}

describe("executeProviderUpdate", () => {
  let mongo: SyncMongoService;
  let commands: CommandRepository;
  let events: EventRepository;
  let occurrences: EventOccurrenceRepository;
  let calendars: ProviderCalendarRepository;

  const now = () => new Date("2026-07-10T00:00:00.000Z");

  const schedule = {
    kind: "timed" as const,
    start: "2026-07-14T09:00:00-06:00",
    end: "2026-07-14T10:00:00-06:00",
    timeZone: "America/Denver",
  };
  const content = (title: string) => ({
    title,
    description: "",
    location: null,
    organizer: null,
    attendees: [],
    conference: null,
  });
  const providerEvent = (title: string, version: string): ProviderEvent => ({
    kind: "event",
    providerEventId: "g-evt-1",
    providerVersion: version,
    providerUpdatedAt: null,
    content: content(title),
    schedule,
    busy: true,
    recurrence: { kind: "single" },
  });

  // Seed a provider-linked event plus an update command that renames it to
  // "New". The provider currently holds "Old" at etag-1.
  const seed = async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const connectionId = objectId() as ConnectionId;
    const calendar = await calendars.upsertByProviderCalendar({
      tenantId,
      principalId,
      connectionId,
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
      content: content("Old"),
      schedule,
      recurrence: { kind: "single" },
      lifecycleState: "active",
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
      input: {
        kind: "update",
        invitation: "all",
        content: content("New"),
        schedule,
        recurrence: { kind: "preserve" },
        scope: "all",
      } as unknown as SyncCommandInput,
      expectedVersion: "etag-1" as never,
    });
    return { tenantId, principalId, calendar, event, command };
  };

  beforeEach(() => {
    mongo = storage.mongo();
    commands = new CommandRepository(mongo.db);
    events = new EventRepository(mongo.db);
    occurrences = new EventOccurrenceRepository(mongo.db, mongo.client);
    calendars = new ProviderCalendarRepository(mongo.db);
  });

  it("patches the provider and commits the new version and content", async () => {
    const { tenantId, principalId, calendar, event, command } = await seed();
    const writer = new FakeUpdateWriter();
    // The provider still holds the old content, so this is a real edit.
    writer.fetched = providerEvent("Old", "etag-1");

    const result = await executeProviderUpdate(
      { commands, events, occurrences, writer, custody: tokenSource() },
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    expect(writer.patchCalls).toHaveLength(1);
    expect(writer.patchCalls[0].expectedVersion).toBe("etag-1");
    expect(writer.patchCalls[0].invitation).toBe("all");
    const stored = await events.findById(tenantId, principalId, event._id);
    expect(stored?.content.title).toBe("New");
    expect(stored?.providerVersion).toBe("etag-2");

    // The occurrence projection is rebuilt with the edited title.
    const occ = await mongo.db
      .collection(SYNC_COLLECTIONS.eventOccurrences)
      .find({ eventId: event._id })
      .toArray();
    expect(occ).toHaveLength(1);
    expect(occ[0]?.["title"]).toBe("New");
  });

  it("confirms without re-patching when the edit already landed (replay)", async () => {
    const { tenantId, principalId, calendar, event, command } = await seed();
    const writer = new FakeUpdateWriter();
    // The provider already holds this command's intended content at a new
    // version — a prior attempt landed before the crash.
    writer.fetched = providerEvent("New", "etag-2");

    const result = await executeProviderUpdate(
      { commands, events, occurrences, writer, custody: tokenSource() },
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    // No second write — the replay is recognized from the fetch.
    expect(writer.patchCalls).toHaveLength(0);
    const stored = await events.findById(tenantId, principalId, event._id);
    expect(stored?.providerVersion).toBe("etag-2");
  });

  it("recognizes a replay even when read-reflected fields drifted", async () => {
    const { calendar, event, command } = await seed();
    const writer = new FakeUpdateWriter();
    // The written fields (title/description/location/schedule) match this
    // command's edit, but an attendee RSVP'd after our patch landed — a field
    // the patch never writes. This must still count as a replay, not a false
    // conflict on an edit that already succeeded.
    writer.fetched = {
      kind: "event",
      providerEventId: "g-evt-1",
      providerVersion: "etag-2",
      providerUpdatedAt: null,
      content: {
        title: "New",
        description: "",
        location: null,
        organizer: null,
        attendees: [
          {
            email: "guest@example.com",
            displayName: null,
            responseStatus: "accepted",
          },
        ],
        conference: null,
      },
      schedule,
      busy: true,
      recurrence: { kind: "single" },
    };

    const result = await executeProviderUpdate(
      { commands, events, occurrences, writer, custody: tokenSource() },
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    expect(writer.patchCalls).toHaveLength(0);
  });

  it("fails with a conflict on a genuine concurrent external edit", async () => {
    const { calendar, event, command } = await seed();
    const writer = new FakeUpdateWriter();
    // The provider was edited externally (different content, and the
    // conditional patch is rejected).
    writer.fetched = providerEvent("Someone else's edit", "etag-9");
    writer.patchError = new ProviderWriteError("versionConflict", "stale");

    const result = await executeProviderUpdate(
      { commands, events, occurrences, writer, custody: tokenSource() },
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("failed");
    expect(
      result.outcome.state === "failed" && result.outcome.failureReason,
    ).toBe("versionConflict");
  });

  it("fails when the provider event no longer exists", async () => {
    const { calendar, event, command } = await seed();
    const writer = new FakeUpdateWriter();
    writer.fetched = null;

    const result = await executeProviderUpdate(
      { commands, events, occurrences, writer, custody: tokenSource() },
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("failed");
    expect(
      result.outcome.state === "failed" && result.outcome.failureReason,
    ).toBe("permanentProviderError");
    expect(writer.patchCalls).toHaveLength(0);
  });

  it("leaves the command pending on a transient patch failure", async () => {
    const { calendar, event, command } = await seed();
    const writer = new FakeUpdateWriter();
    writer.fetched = providerEvent("Old", "etag-1");
    writer.patchError = new ProviderWriteError("transient", "blip");

    const result = await executeProviderUpdate(
      { commands, events, occurrences, writer, custody: tokenSource() },
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("pending");
  });

  it("fails without touching the provider when the credential is revoked", async () => {
    const { calendar, event, command } = await seed();
    const writer = new FakeUpdateWriter();

    const result = await executeProviderUpdate(
      {
        commands,
        events,
        occurrences,
        writer,
        custody: failingTokenSource(
          new ProviderAuthError("authorizationRevoked", "revoked"),
        ),
      },
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("failed");
    expect(writer.fetchCalls).toHaveLength(0);
    expect(writer.patchCalls).toHaveLength(0);
  });

  it("discards the credential when a writer 401 classifies as authorizationRevoked", async () => {
    const { calendar, event, command } = await seed();
    const credentials = new CredentialRepository(mongo.db);
    await storeCredential(credentials, calendar.connectionId, {
      token: "still-cached",
      expiresAt: new Date("2099-01-01T00:00:00Z"),
    });
    const custody = new CredentialCustody(
      credentials,
      new RevokedAuthAdapter(),
    );
    const writer = new FakeUpdateWriter();
    writer.fetchError = new ProviderWriteError(
      "authorizationRevoked",
      "token rejected",
    );

    const result = await executeProviderUpdate(
      { commands, events, occurrences, writer, custody },
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("failed");
    expect(
      result.outcome.state === "failed" && result.outcome.failureReason,
    ).toBe("authorizationRevoked");
    expect(
      await credentials.findByConnection(calendar.connectionId),
    ).toBeNull();
  });
});

// A writer for the delete path: a configurable deleteEvent (success or a preset
// error), recording its inputs.
class FakeDeleteWriter implements ProviderEventWriter {
  readonly provider = "google" as const;
  deleteCalls: ProviderDeleteInput[] = [];
  deleteError?: unknown;
  createEvent(): Promise<ProviderWriteResult> {
    throw new Error("unused");
  }
  patchEvent(): Promise<ProviderWriteResult> {
    throw new Error("unused");
  }
  async deleteEvent(input: ProviderDeleteInput): Promise<void> {
    this.deleteCalls.push(input);
    if (this.deleteError) throw this.deleteError;
  }
  fetchEvent(): Promise<null> {
    throw new Error("unused");
  }
}

describe("executeProviderDelete", () => {
  let mongo: SyncMongoService;
  let commands: CommandRepository;
  let events: EventRepository;
  let occurrences: EventOccurrenceRepository;
  let markers: DeletionMarkerRepository;

  const now = () => new Date("2026-07-10T00:00:00.000Z");

  const schedule = {
    kind: "timed" as const,
    start: "2026-07-14T09:00:00-06:00",
    end: "2026-07-14T10:00:00-06:00",
    timeZone: "America/Denver",
  };

  // Seed a provider-linked event plus a delete command for it.
  const seed = async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const connectionId = objectId() as ConnectionId;
    const calendar: ProviderCalendarRecord = {
      _id: objectId() as never,
      tenantId,
      principalId,
      connectionId,
      providerCalendarId: "primary@google.com" as never,
      displayName: "Google",
      color: null,
      active: true,
      primary: true,
      accessRole: "owner",
      capabilities: [],
      createdAt: now(),
      updatedAt: now(),
    } as never;
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
      lifecycleState: "active",
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
      input: { kind: "delete", invitation: "all", scope: "all" } as never,
      expectedVersion: null,
    });
    return { tenantId, principalId, calendar, event, command };
  };

  beforeEach(() => {
    mongo = storage.mongo();
    commands = new CommandRepository(mongo.db);
    events = new EventRepository(mongo.db);
    occurrences = new EventOccurrenceRepository(mongo.db, mongo.client);
    markers = new DeletionMarkerRepository(mongo.db);
  });

  it("deletes at the provider, tombstones, removes the local event, and confirms", async () => {
    const { tenantId, principalId, calendar, event, command } = await seed();
    const writer = new FakeDeleteWriter();
    // Project the event first so the delete has occurrences to clear.
    await reprojectOccurrences(occurrences, event, now);
    const occurrenceCount = () =>
      mongo.db
        .collection(SYNC_COLLECTIONS.eventOccurrences)
        .countDocuments({ eventId: event._id });
    expect(await occurrenceCount()).toBe(1);

    const result = await executeProviderDelete(
      {
        commands,
        events,
        occurrences,
        writer,
        custody: tokenSource(),
        markers,
      },
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    expect(writer.deleteCalls).toHaveLength(1);
    expect(writer.deleteCalls[0].invitation).toBe("all");
    // Local content is gone, a content-free marker remains, occurrences cleared.
    expect(await events.findById(tenantId, principalId, event._id)).toBeNull();
    expect(await occurrenceCount()).toBe(0);
    expect(
      await markers.exists(
        calendar.connectionId,
        event.calendarId,
        "g-evt-1" as never,
      ),
    ).toBe(true);
  });

  it("confirms idempotently when the local event is already gone (replay)", async () => {
    const { tenantId, principalId, calendar, event, command } = await seed();
    const writer = new FakeDeleteWriter();
    // Simulate a prior attempt having already removed the local event.
    await events.deleteById(tenantId, principalId, event._id);

    const result = await executeProviderDelete(
      {
        commands,
        events,
        occurrences,
        writer,
        custody: tokenSource(),
        markers,
      },
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    // Nothing to re-delete at the provider — the local absence proves it landed.
    expect(writer.deleteCalls).toHaveLength(0);
  });

  it("cascades local series exceptions when deleting a provider series", async () => {
    // Staging repro: Google-side instance override stays in Sync after the
    // master is deleted with scope=all, and keeps resurfacing in range reads.
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const connectionId = objectId() as ConnectionId;
    const calendar: ProviderCalendarRecord = {
      _id: objectId() as never,
      tenantId,
      principalId,
      connectionId,
      providerCalendarId: "primary@google.com" as never,
      displayName: "Google",
      color: null,
      active: true,
      primary: true,
      accessRole: "owner",
      capabilities: [],
      createdAt: now(),
      updatedAt: now(),
    } as never;
    const masterId = objectId() as EventId;
    await events.put({
      _id: masterId,
      tenantId,
      principalId,
      origin: "provider",
      calendarId: calendar._id,
      clientEventId: null,
      connectionId,
      providerEventId: "g-series-1" as never,
      providerVersion: "etag-1" as never,
      providerUpdatedAt: null,
      deliveryState: "confirmed",
      providerMetadata: null,
      content: {
        title: "Weekly",
        description: "",
        location: null,
        organizer: null,
        attendees: [],
        conference: null,
      },
      schedule,
      recurrence: {
        kind: "seriesMaster",
        rules: ["RRULE:FREQ=WEEKLY;COUNT=4"],
      },
      lifecycleState: "active",
      generation: 0,
      createdAt: now(),
      updatedAt: now(),
      confirmedAt: now(),
    } as never);
    const master = await events.findById(tenantId, principalId, masterId);
    if (!master) throw new Error("seed failed to read back the master");
    const exceptionId = objectId() as EventId;
    await events.put({
      _id: exceptionId,
      tenantId,
      principalId,
      origin: "provider",
      calendarId: calendar._id,
      clientEventId: null,
      connectionId,
      providerEventId: "g-inst-override" as never,
      providerVersion: "etag-1" as never,
      providerUpdatedAt: null,
      deliveryState: "confirmed",
      providerMetadata: null,
      content: {
        title: "Moved instance",
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
      recurrence: {
        kind: "exception",
        seriesId: masterId,
        recurrenceId: "2026-07-21T09:00:00-06:00" as never,
        cancelled: false,
      },
      lifecycleState: "active",
      generation: 0,
      createdAt: now(),
      updatedAt: now(),
      confirmedAt: now(),
    } as never);
    const exception = await events.findById(tenantId, principalId, exceptionId);
    if (!exception) throw new Error("seed failed to read back the exception");
    await reprojectOccurrences(occurrences, master, now);
    await reprojectOccurrences(occurrences, exception, now);
    const { record: command } = await commands.submit({
      tenantId,
      principalId,
      idempotencyKey: `idem-${objectId()}` as IdempotencyKey,
      eventId: masterId,
      input: { kind: "delete", invitation: "none", scope: "all" } as never,
      expectedVersion: null,
    });

    const result = await executeProviderDelete(
      {
        commands,
        events,
        occurrences,
        writer: new FakeDeleteWriter(),
        custody: tokenSource(),
        markers,
      },
      command,
      master,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    expect(await events.findById(tenantId, principalId, masterId)).toBeNull();
    expect(
      await events.findById(tenantId, principalId, exceptionId),
    ).toBeNull();
    expect(
      await events.findSeriesExceptions(tenantId, principalId, masterId),
    ).toEqual([]);
    expect(
      await mongo.db
        .collection(SYNC_COLLECTIONS.eventOccurrences)
        .countDocuments({ eventId: { $in: [masterId, exceptionId] } }),
    ).toBe(0);
  });

  it("clears leftover series exceptions on an already-gone master replay", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const connectionId = objectId() as ConnectionId;
    const calendar: ProviderCalendarRecord = {
      _id: objectId() as never,
      tenantId,
      principalId,
      connectionId,
      providerCalendarId: "primary@google.com" as never,
      displayName: "Google",
      color: null,
      active: true,
      primary: true,
      accessRole: "owner",
      capabilities: [],
      createdAt: now(),
      updatedAt: now(),
    } as never;
    const masterId = objectId() as EventId;
    const exceptionId = objectId() as EventId;
    // Master already removed (prior attempt); orphan exception remains.
    await events.put({
      _id: exceptionId,
      tenantId,
      principalId,
      origin: "provider",
      calendarId: calendar._id,
      clientEventId: null,
      connectionId,
      providerEventId: "g-inst-orphan" as never,
      providerVersion: "etag-1" as never,
      providerUpdatedAt: null,
      deliveryState: "confirmed",
      providerMetadata: null,
      content: {
        title: "Orphan",
        description: "",
        location: null,
        organizer: null,
        attendees: [],
        conference: null,
      },
      schedule,
      recurrence: {
        kind: "exception",
        seriesId: masterId,
        recurrenceId: "2026-07-21T09:00:00-06:00" as never,
        cancelled: false,
      },
      lifecycleState: "active",
      generation: 0,
      createdAt: now(),
      updatedAt: now(),
      confirmedAt: now(),
    } as never);
    const ghostMaster = {
      _id: masterId,
      tenantId,
      principalId,
      origin: "provider",
      calendarId: calendar._id,
      clientEventId: null,
      connectionId,
      providerEventId: "g-series-1" as never,
      providerVersion: "etag-1" as never,
      providerUpdatedAt: null,
      deliveryState: "confirmed",
      providerMetadata: null,
      content: {
        title: "Weekly",
        description: "",
        location: null,
        organizer: null,
        attendees: [],
        conference: null,
      },
      schedule,
      recurrence: {
        kind: "seriesMaster",
        rules: ["RRULE:FREQ=WEEKLY;COUNT=4"],
      },
      lifecycleState: "active",
      generation: 0,
      createdAt: now(),
      updatedAt: now(),
      confirmedAt: now(),
    } as EventRecord;
    const { record: command } = await commands.submit({
      tenantId,
      principalId,
      idempotencyKey: `idem-${objectId()}` as IdempotencyKey,
      eventId: masterId,
      input: { kind: "delete", invitation: "none", scope: "all" } as never,
      expectedVersion: null,
    });

    const result = await executeProviderDelete(
      {
        commands,
        events,
        occurrences,
        writer: new FakeDeleteWriter(),
        custody: tokenSource(),
        markers,
      },
      command,
      ghostMaster,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    expect(
      await events.findById(tenantId, principalId, exceptionId),
    ).toBeNull();
  });

  it("keeps the event deletionPending and stays pending on a transient failure", async () => {
    const { tenantId, principalId, calendar, event, command } = await seed();
    const writer = new FakeDeleteWriter();
    writer.deleteError = new ProviderWriteError("transient", "blip");

    const result = await executeProviderDelete(
      {
        commands,
        events,
        occurrences,
        writer,
        custody: tokenSource(),
        markers,
      },
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("pending");
    const stored = await events.findById(tenantId, principalId, event._id);
    expect(stored?.lifecycleState).toBe("deletionPending");
  });

  it("reverts the event to active and fails on a terminal error", async () => {
    const { tenantId, principalId, calendar, event, command } = await seed();
    const writer = new FakeDeleteWriter();
    writer.deleteError = new ProviderWriteError(
      "readOnlyCalendar",
      "read only",
    );

    const result = await executeProviderDelete(
      {
        commands,
        events,
        occurrences,
        writer,
        custody: tokenSource(),
        markers,
      },
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("failed");
    expect(
      result.outcome.state === "failed" && result.outcome.failureReason,
    ).toBe("readOnlyCalendar");
    // The event is restored — a failed delete must not leave it "deleting".
    const stored = await events.findById(tenantId, principalId, event._id);
    expect(stored?.lifecycleState).toBe("active");
  });

  it("reverts and fails without deleting when the credential is revoked", async () => {
    const { tenantId, principalId, calendar, event, command } = await seed();
    const writer = new FakeDeleteWriter();

    const result = await executeProviderDelete(
      {
        commands,
        events,
        occurrences,
        writer,
        custody: failingTokenSource(
          new ProviderAuthError("authorizationRevoked", "revoked"),
        ),
        markers,
      },
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("failed");
    expect(writer.deleteCalls).toHaveLength(0);
    const stored = await events.findById(tenantId, principalId, event._id);
    expect(stored?.lifecycleState).toBe("active");
  });
});

describe("executeProviderSeriesUpdate", () => {
  let mongo: SyncMongoService;
  let commands: CommandRepository;
  let events: EventRepository;
  let occurrences: EventOccurrenceRepository;
  let calendars: ProviderCalendarRepository;

  const now = () => new Date("2026-07-10T00:00:00.000Z");

  // A weekly series of four occurrences starting 2026-07-14 09:00 Denver.
  const schedule = {
    kind: "timed" as const,
    start: "2026-07-14T09:00:00-06:00",
    end: "2026-07-14T10:00:00-06:00",
    timeZone: "America/Denver",
  };
  const weekly4 = ["RRULE:FREQ=WEEKLY;COUNT=4"];
  const weekly2 = ["RRULE:FREQ=WEEKLY;COUNT=2"];
  const content = (title: string) => ({
    title,
    description: "",
    location: null,
    organizer: null,
    attendees: [],
    conference: null,
  });
  // The provider's view of the series master, with its current rules.
  const providerSeries = (
    title: string,
    version: string,
    rules: readonly string[],
  ): ProviderEvent => ({
    kind: "event",
    providerEventId: "g-evt-1",
    providerVersion: version,
    providerUpdatedAt: null,
    content: content(title),
    schedule,
    busy: true,
    recurrence: { kind: "seriesMaster", rules: [...rules] },
  });

  // Seed a provider-linked series master ("Old", weekly x4 at etag-1).
  const seedMaster = async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const connectionId = objectId() as ConnectionId;
    const calendar = await calendars.upsertByProviderCalendar({
      tenantId,
      principalId,
      connectionId,
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
      content: content("Old"),
      schedule,
      recurrence: { kind: "seriesMaster", rules: [...weekly4] },
      lifecycleState: "active",
      generation: 0,
      createdAt: now(),
      updatedAt: now(),
      confirmedAt: now(),
    } as never);
    const master = await events.findById(tenantId, principalId, eventId);
    if (!master) throw new Error("seed failed to read back the master");
    // Project the master so the read model starts with its four occurrences.
    await reprojectOccurrences(occurrences, master, now);
    return { tenantId, principalId, calendar, master };
  };

  // An edit-all update command for the seeded master.
  const editAllCommand = async (
    master: EventRecord,
    edit: { title: string; recurrence: RecurrenceEdit },
  ) =>
    (
      await commands.submit({
        tenantId: master.tenantId,
        principalId: master.principalId,
        idempotencyKey: `idem-${objectId()}` as IdempotencyKey,
        eventId: master._id,
        input: {
          kind: "update",
          invitation: "all",
          content: content(edit.title),
          schedule,
          recurrence: edit.recurrence,
          scope: "all",
          recurrenceId: null,
        } as unknown as SyncCommandInput,
        expectedVersion: "etag-1" as never,
      })
    ).record;

  const masterOccurrences = (eventId: EventId) =>
    mongo.db
      .collection(SYNC_COLLECTIONS.eventOccurrences)
      .find({ eventId })
      .sort({ startAt: 1 })
      .toArray();

  // Seed a provider-linked series exception. Real provider exceptions come from
  // import (a later slice) and each carries its OWN provider event id, so this
  // seeds a distinct providerEventId rather than reusing the master's — the
  // provider-identity unique index forbids sharing it.
  const putException = async (
    master: EventRecord,
    opts: {
      providerEventId: string;
      recurrenceId: string;
      cancelled: boolean;
      title: string;
    },
  ): Promise<EventRecord> => {
    const id = objectId() as EventId;
    await events.put({
      _id: id,
      tenantId: master.tenantId,
      principalId: master.principalId,
      origin: "compass",
      calendarId: master.calendarId,
      clientEventId: null,
      connectionId: master.connectionId,
      providerEventId: opts.providerEventId as never,
      providerVersion: "etag-1" as never,
      providerUpdatedAt: null,
      deliveryState: "confirmed",
      providerMetadata: null,
      content: content(opts.title),
      schedule,
      recurrence: {
        kind: "exception",
        seriesId: master._id,
        recurrenceId: opts.recurrenceId as never,
        cancelled: opts.cancelled,
      },
      lifecycleState: "active",
      generation: 0,
      createdAt: now(),
      updatedAt: now(),
      confirmedAt: now(),
    } as never);
    const stored = await events.findById(
      master.tenantId,
      master.principalId,
      id,
    );
    if (!stored) throw new Error("seed failed to read back the exception");
    return stored;
  };

  beforeEach(() => {
    mongo = storage.mongo();
    commands = new CommandRepository(mongo.db);
    events = new EventRepository(mongo.db);
    occurrences = new EventOccurrenceRepository(mongo.db, mongo.client);
    calendars = new ProviderCalendarRepository(mongo.db);
  });

  const deps = (writer: ProviderEventWriter) => ({
    commands,
    events,
    occurrences,
    writer,
    custody: tokenSource(),
  });

  it("patches the whole series and reprojects with the edited content", async () => {
    const { tenantId, principalId, calendar, master } = await seedMaster();
    const command = await editAllCommand(master, {
      title: "New",
      recurrence: { kind: "preserve" },
    });
    const writer = new FakeUpdateWriter();
    writer.fetched = providerSeries("Old", "etag-1", weekly4);
    writer.patchResult = {
      providerEventId: "g-evt-1",
      providerVersion: "etag-2",
    };

    const result = await executeProviderSeriesUpdate(
      deps(writer),
      command,
      master,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    // Preserve re-writes the master's own rules; the whole series is patched.
    expect(writer.patchCalls).toHaveLength(1);
    expect(writer.patchCalls[0].recurrence).toEqual({
      kind: "series",
      rules: [...weekly4],
    });
    const stored = await events.findById(tenantId, principalId, master._id);
    expect(stored?.content.title).toBe("New");
    expect(stored?.providerVersion).toBe("etag-2");
    expect(stored?.recurrence).toEqual({
      kind: "seriesMaster",
      rules: [...weekly4],
    });
    // All four occurrences carry the edited title.
    const occ = await masterOccurrences(master._id);
    expect(occ).toHaveLength(4);
    expect(occ.every((o) => o["title"] === "New")).toBe(true);
  });

  it("patches on a rules-only edit instead of treating it as a replay", async () => {
    const { tenantId, principalId, calendar, master } = await seedMaster();
    // Same title and schedule, only the recurrence rule shrinks 4 -> 2. Without
    // comparing recurrence this would look identical to the provider's current
    // state and be confirmed WITHOUT ever writing the new rule.
    const command = await editAllCommand(master, {
      title: "Old",
      recurrence: { kind: "series", rules: weekly2 },
    });
    const writer = new FakeUpdateWriter();
    writer.fetched = providerSeries("Old", "etag-1", weekly4);
    writer.patchResult = {
      providerEventId: "g-evt-1",
      providerVersion: "etag-2",
    };

    const result = await executeProviderSeriesUpdate(
      deps(writer),
      command,
      master,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    expect(writer.patchCalls).toHaveLength(1);
    expect(writer.patchCalls[0].recurrence).toEqual({
      kind: "series",
      rules: [...weekly2],
    });
    const stored = await events.findById(tenantId, principalId, master._id);
    expect(stored?.recurrence).toEqual({
      kind: "seriesMaster",
      rules: [...weekly2],
    });
    // The horizon now holds only the two remaining occurrences.
    expect(await masterOccurrences(master._id)).toHaveLength(2);
  });

  it("confirms without re-patching when the whole edit already landed", async () => {
    const { calendar, master } = await seedMaster();
    const command = await editAllCommand(master, {
      title: "New",
      recurrence: { kind: "series", rules: weekly2 },
    });
    const writer = new FakeUpdateWriter();
    // Provider already holds the edited content AND the new rules at a fresh
    // version — a prior attempt landed before the crash.
    writer.fetched = providerSeries("New", "etag-2", weekly2);

    const result = await executeProviderSeriesUpdate(
      deps(writer),
      command,
      master,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    expect(writer.patchCalls).toHaveLength(0);
  });

  it("treats a reformatted-but-equivalent rule echo as a replay", async () => {
    const { calendar, master } = await seedMaster();
    const command = await editAllCommand(master, {
      title: "New",
      recurrence: {
        kind: "series",
        rules: ["RRULE:FREQ=WEEKLY;COUNT=4;INTERVAL=1"],
      },
    });
    const writer = new FakeUpdateWriter();
    // The provider echoes the same rule reordered and lowercased at a new
    // version — our edit landed on a prior attempt. A byte-for-byte compare
    // would miss it and re-patch with a now-stale version, failing a write that
    // already succeeded.
    writer.fetched = providerSeries("New", "etag-2", [
      "rrule:interval=1;count=4;freq=weekly",
    ]);

    const result = await executeProviderSeriesUpdate(
      deps(writer),
      command,
      master,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    expect(writer.patchCalls).toHaveLength(0);
  });

  it("fails with a conflict on a genuine concurrent external edit", async () => {
    const { calendar, master } = await seedMaster();
    const command = await editAllCommand(master, {
      title: "New",
      recurrence: { kind: "preserve" },
    });
    const writer = new FakeUpdateWriter();
    writer.fetched = providerSeries("Someone else", "etag-9", weekly4);
    writer.patchError = new ProviderWriteError("versionConflict", "stale");

    const result = await executeProviderSeriesUpdate(
      deps(writer),
      command,
      master,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("failed");
    expect(
      result.outcome.state === "failed" && result.outcome.failureReason,
    ).toBe("versionConflict");
  });

  it("discards override exceptions but keeps cancelled tombstones", async () => {
    const { tenantId, principalId, calendar, master } = await seedMaster();
    // An override on the 2nd instant and a cancellation on the 3rd.
    const override = await putException(master, {
      providerEventId: "g-inst-override",
      recurrenceId: "2026-07-21T09:00:00-06:00",
      cancelled: false,
      title: "Moved",
    });
    await putException(master, {
      providerEventId: "g-inst-cancelled",
      recurrenceId: "2026-07-28T09:00:00-06:00",
      cancelled: true,
      title: "Old",
    });
    const command = await editAllCommand(master, {
      title: "New",
      recurrence: { kind: "preserve" },
    });
    const writer = new FakeUpdateWriter();
    writer.fetched = providerSeries("Old", "etag-1", weekly4);

    const result = await executeProviderSeriesUpdate(
      deps(writer),
      command,
      master,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    // The override is gone; the cancelled tombstone survives the edit.
    expect(
      await events.findById(tenantId, principalId, override._id),
    ).toBeNull();
    const remaining = await events.findSeriesExceptions(
      tenantId,
      principalId,
      master._id,
    );
    expect(remaining).toHaveLength(1);
    expect(
      remaining[0]?.recurrence.kind === "exception" &&
        remaining[0]?.recurrence.cancelled,
    ).toBe(true);
    // The reprojected master excludes the cancelled instant (2026-07-28 15:00Z)
    // but re-covers the formerly-overridden instant, so three master rows remain.
    const occ = await masterOccurrences(master._id);
    const starts = occ.map((o) => (o["startAt"] as Date).toISOString());
    expect(starts).toEqual([
      "2026-07-14T15:00:00.000Z",
      "2026-07-21T15:00:00.000Z",
      "2026-08-04T15:00:00.000Z",
    ]);
  });

  it("converts a series to a single event, dropping every exception", async () => {
    const { tenantId, principalId, calendar, master } = await seedMaster();
    await putException(master, {
      providerEventId: "g-inst-cancelled",
      recurrenceId: "2026-07-28T09:00:00-06:00",
      cancelled: true,
      title: "Old",
    });
    const command = await editAllCommand(master, {
      title: "Just once",
      recurrence: { kind: "single" },
    });
    const writer = new FakeUpdateWriter();
    writer.fetched = providerSeries("Old", "etag-1", weekly4);

    const result = await executeProviderSeriesUpdate(
      deps(writer),
      command,
      master,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    // The provider write removes recurrence.
    expect(writer.patchCalls[0].recurrence).toEqual({ kind: "single" });
    const stored = await events.findById(tenantId, principalId, master._id);
    expect(stored?.recurrence).toEqual({ kind: "single" });
    // No exceptions survive a conversion to a single event, and the master
    // projects exactly one occurrence.
    expect(
      await events.findSeriesExceptions(tenantId, principalId, master._id),
    ).toHaveLength(0);
    expect(await masterOccurrences(master._id)).toHaveLength(1);
  });

  it("converges when executed twice (idempotent retry)", async () => {
    const { tenantId, principalId, calendar, master } = await seedMaster();
    const command = await editAllCommand(master, {
      title: "New",
      recurrence: { kind: "series", rules: weekly2 },
    });
    const writer = new FakeUpdateWriter();
    writer.fetched = providerSeries("Old", "etag-1", weekly4);
    writer.patchResult = {
      providerEventId: "g-evt-1",
      providerVersion: "etag-2",
    };

    await executeProviderSeriesUpdate(
      deps(writer),
      command,
      master,
      calendar,
      now,
    );
    // The provider now reflects the landed edit, so a retry is a replay.
    writer.fetched = providerSeries("New", "etag-2", weekly2);
    const second = await executeProviderSeriesUpdate(
      deps(writer),
      command,
      master,
      calendar,
      now,
    );

    expect(second.outcome.state).toBe("confirmed");
    // Only the first attempt wrote; the retry recognized the replay.
    expect(writer.patchCalls).toHaveLength(1);
    const owned = await events.listByCalendar({
      tenantId,
      principalId,
      calendarId: calendar._id,
      generation: 0,
      limit: 10,
    });
    expect(owned).toHaveLength(1);
    expect(await masterOccurrences(master._id)).toHaveLength(2);
  });

  it("leaves the command pending on a transient patch failure", async () => {
    const { calendar, master } = await seedMaster();
    const command = await editAllCommand(master, {
      title: "New",
      recurrence: { kind: "preserve" },
    });
    const writer = new FakeUpdateWriter();
    writer.fetched = providerSeries("Old", "etag-1", weekly4);
    writer.patchError = new ProviderWriteError("transient", "blip");

    const result = await executeProviderSeriesUpdate(
      deps(writer),
      command,
      master,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("pending");
  });
});

// A writer covering every method the recurring-scope executors below use:
// fetchInstanceAt (resolve one occurrence), fetchEvent/patchEvent (the master,
// for a thisAndFollowing truncation), deleteEvent (cancel one instance), and
// createEvent (the remainder series of a split). Each result/error is
// independently scriptable so a test can isolate exactly which call it means
// to exercise.
class FakeRecurringWriter implements ProviderEventWriter {
  readonly provider = "google" as const;
  fetchEventResult: ProviderEvent | null = null;
  fetchEventError?: unknown;
  fetchInstanceResult: ProviderEvent | null = null;
  fetchInstanceError?: unknown;
  patchResult: ProviderWriteResult = {
    providerEventId: "g-evt-1",
    providerVersion: "etag-2",
  };
  patchError?: unknown;
  deleteError?: unknown;
  createResult: ProviderWriteResult = {
    providerEventId: "g-remainder-1",
    providerVersion: "etag-1",
  };
  createError?: unknown;
  fetchEventCalls: ProviderFetchInput[] = [];
  fetchInstanceCalls: ProviderInstanceFetchInput[] = [];
  patchCalls: ProviderPatchInput[] = [];
  deleteCalls: ProviderDeleteInput[] = [];
  createCalls: ProviderCreateInput[] = [];

  async createEvent(input: ProviderCreateInput): Promise<ProviderWriteResult> {
    this.createCalls.push(input);
    if (this.createError) throw this.createError;
    return this.createResult;
  }
  async patchEvent(input: ProviderPatchInput): Promise<ProviderWriteResult> {
    this.patchCalls.push(input);
    if (this.patchError) throw this.patchError;
    return this.patchResult;
  }
  async deleteEvent(input: ProviderDeleteInput): Promise<void> {
    this.deleteCalls.push(input);
    if (this.deleteError) throw this.deleteError;
  }
  async fetchEvent(input: ProviderFetchInput): Promise<ProviderEvent | null> {
    this.fetchEventCalls.push(input);
    if (this.fetchEventError) throw this.fetchEventError;
    return this.fetchEventResult;
  }
  async fetchInstanceAt(
    input: ProviderInstanceFetchInput,
  ): Promise<ProviderEvent | null> {
    this.fetchInstanceCalls.push(input);
    if (this.fetchInstanceError) throw this.fetchInstanceError;
    return this.fetchInstanceResult;
  }
}

describe("provider-linked recurring scopes (this / thisAndFollowing)", () => {
  let mongo: SyncMongoService;
  let commands: CommandRepository;
  let events: EventRepository;
  let occurrences: EventOccurrenceRepository;
  let calendars: ProviderCalendarRepository;
  let markers: DeletionMarkerRepository;

  const now = () => new Date("2026-07-10T00:00:00.000Z");

  // A weekly series of three occurrences starting 2026-07-14 09:00 Denver:
  // 07-14, 07-21, 07-28 (all 15:00Z). Matches the cloud-path test fixtures
  // exactly, so results are directly comparable.
  const schedule = {
    kind: "timed" as const,
    start: "2026-07-14T09:00:00-06:00",
    end: "2026-07-14T10:00:00-06:00",
    timeZone: "America/Denver",
  };
  const weekly3 = ["RRULE:FREQ=WEEKLY;COUNT=3"];
  const SECOND_START = "2026-07-21T09:00:00-06:00";
  const SECOND_START_UTC = "2026-07-21T15:00:00.000Z";
  const content = (title: string) => ({
    title,
    description: "",
    location: null,
    organizer: null,
    attendees: [],
    conference: null,
  });
  const providerInstance = (
    providerEventId: string,
    title: string,
    version: string,
    instanceSchedule = {
      kind: "timed" as const,
      start: SECOND_START,
      end: "2026-07-21T10:00:00-06:00",
      timeZone: "America/Denver",
    },
  ): ProviderEvent => ({
    kind: "event",
    providerEventId,
    providerVersion: version,
    providerUpdatedAt: null,
    content: content(title),
    schedule: instanceSchedule,
    busy: true,
    recurrence: { kind: "single" },
  });
  const providerSeries = (
    title: string,
    version: string,
    rules: readonly string[],
  ): ProviderEvent => ({
    kind: "event",
    providerEventId: "g-series-1",
    providerVersion: version,
    providerUpdatedAt: null,
    content: content(title),
    schedule,
    busy: true,
    recurrence: { kind: "seriesMaster", rules: [...rules] },
  });

  const seedMaster = async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const connectionId = objectId() as ConnectionId;
    const calendar = await calendars.upsertByProviderCalendar({
      tenantId,
      principalId,
      connectionId,
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
    const eventId = objectId() as EventId;
    await events.put({
      _id: eventId,
      tenantId,
      principalId,
      origin: "compass",
      calendarId: calendar._id,
      clientEventId: null,
      connectionId,
      providerEventId: "g-series-1" as never,
      providerVersion: "etag-1" as never,
      providerUpdatedAt: null,
      deliveryState: "confirmed",
      providerMetadata: null,
      content: content("Old"),
      schedule,
      recurrence: { kind: "seriesMaster", rules: [...weekly3] },
      lifecycleState: "active",
      generation: 0,
      createdAt: now(),
      updatedAt: now(),
      confirmedAt: now(),
    } as never);
    const master = await events.findById(tenantId, principalId, eventId);
    if (!master) throw new Error("seed failed to read back the master");
    await reprojectOccurrences(occurrences, master, now);
    return { tenantId, principalId, calendar, master };
  };

  const occurrenceStartsFor = async (eventId: EventId): Promise<string[]> => {
    const docs = await mongo.db
      .collection(SYNC_COLLECTIONS.eventOccurrences)
      .find({ eventId })
      .sort({ startAt: 1 })
      .toArray();
    return docs.map((doc) => (doc["startAt"] as Date).toISOString());
  };

  const otherSeriesMaster = (principalId: PrincipalId, masterId: EventId) =>
    mongo.db
      .collection(SYNC_COLLECTIONS.events)
      .find({
        principalId,
        "recurrence.kind": "seriesMaster",
        _id: { $ne: masterId },
      })
      .toArray();

  const thisScopeCommand = async (
    master: EventRecord,
    kind: "update" | "delete",
    title = "Edited",
  ) =>
    (
      await commands.submit({
        tenantId: master.tenantId,
        principalId: master.principalId,
        idempotencyKey: `idem-${objectId()}` as IdempotencyKey,
        eventId: master._id,
        input:
          kind === "update"
            ? ({
                kind: "update",
                invitation: "none",
                content: content(title),
                schedule: {
                  kind: "timed",
                  start: SECOND_START,
                  end: "2026-07-21T10:00:00-06:00",
                  timeZone: "America/Denver",
                },
                recurrence: { kind: "preserve" },
                scope: "this",
                recurrenceId: SECOND_START,
              } as unknown as SyncCommandInput)
            : ({
                kind: "delete",
                invitation: "none",
                scope: "this",
                recurrenceId: SECOND_START,
              } as unknown as SyncCommandInput),
        expectedVersion: null,
      })
    ).record;

  const followingCommand = async (
    master: EventRecord,
    kind: "update" | "delete",
    splitAt = SECOND_START,
    title = "Split",
  ) =>
    (
      await commands.submit({
        tenantId: master.tenantId,
        principalId: master.principalId,
        idempotencyKey: `idem-${objectId()}` as IdempotencyKey,
        eventId: master._id,
        input:
          kind === "update"
            ? ({
                kind: "update",
                invitation: "none",
                content: content(title),
                schedule: {
                  kind: "timed",
                  start: splitAt,
                  end: "2026-07-21T10:00:00-06:00",
                  timeZone: "America/Denver",
                },
                recurrence: {
                  kind: "series",
                  rules: ["RRULE:FREQ=WEEKLY;COUNT=2"],
                },
                scope: "thisAndFollowing",
                recurrenceId: splitAt,
              } as unknown as SyncCommandInput)
            : ({
                kind: "delete",
                invitation: "none",
                scope: "thisAndFollowing",
                recurrenceId: splitAt,
              } as unknown as SyncCommandInput),
        expectedVersion: null,
      })
    ).record;

  const deps = (writer: FakeRecurringWriter) => ({
    commands,
    events,
    occurrences,
    writer,
    custody: tokenSource(),
  });
  const deleteDeps = (writer: FakeRecurringWriter) => ({
    ...deps(writer),
    markers,
  });

  beforeEach(() => {
    mongo = storage.mongo();
    commands = new CommandRepository(mongo.db);
    events = new EventRepository(mongo.db);
    occurrences = new EventOccurrenceRepository(mongo.db, mongo.client);
    calendars = new ProviderCalendarRepository(mongo.db);
    markers = new DeletionMarkerRepository(mongo.db);
  });

  describe("executeProviderOccurrenceUpdate", () => {
    it("resolves the instance, patches IT (not the master), and stores its own provider identity", async () => {
      const { tenantId, principalId, calendar, master } = await seedMaster();
      const command = await thisScopeCommand(master, "update", "Moved");
      const writer = new FakeRecurringWriter();
      writer.fetchInstanceResult = providerInstance(
        "g-inst-1",
        "Old",
        "etag-1",
      );

      const result = await executeProviderOccurrenceUpdate(
        deps(writer),
        command,
        master,
        calendar,
        now,
      );

      expect(result.outcome.state).toBe("confirmed");
      expect(writer.fetchInstanceCalls[0]).toMatchObject({
        seriesProviderEventId: "g-series-1",
        originalStartAt: SECOND_START,
      });
      // Patched the INSTANCE's own resolved id, never the master's.
      expect(writer.patchCalls[0]?.providerEventId).toBe("g-inst-1");

      const exceptions = await events.findSeriesExceptions(
        tenantId,
        principalId,
        master._id,
      );
      expect(exceptions).toHaveLength(1);
      // The exception carries the INSTANCE's own provider identity, not the
      // master's — sharing the master's would collide the unique
      // provider_event_identity index.
      expect(exceptions[0]?.providerEventId).toBe("g-inst-1");
      expect(exceptions[0]?.content.title).toBe("Moved");
      // The master no longer projects the overridden instant.
      expect(await occurrenceStartsFor(master._id)).not.toContain(
        SECOND_START_UTC,
      );
    });

    it("confirms without re-patching when the edit already landed (replay)", async () => {
      const { calendar, master } = await seedMaster();
      const command = await thisScopeCommand(master, "update", "Moved");
      const writer = new FakeRecurringWriter();
      // The instance already carries this command's intended content.
      writer.fetchInstanceResult = providerInstance(
        "g-inst-1",
        "Moved",
        "etag-2",
      );

      const result = await executeProviderOccurrenceUpdate(
        deps(writer),
        command,
        master,
        calendar,
        now,
      );

      expect(result.outcome.state).toBe("confirmed");
      expect(writer.patchCalls).toHaveLength(0);
    });

    it("fails without writing when no instance exists at that instant", async () => {
      const { calendar, master } = await seedMaster();
      const command = await thisScopeCommand(master, "update");
      const writer = new FakeRecurringWriter();
      writer.fetchInstanceResult = null;

      const result = await executeProviderOccurrenceUpdate(
        deps(writer),
        command,
        master,
        calendar,
        now,
      );

      expect(result.outcome.state).toBe("failed");
      expect(
        result.outcome.state === "failed" && result.outcome.failureReason,
      ).toBe("permanentProviderError");
      expect(writer.patchCalls).toHaveLength(0);
    });

    it("leaves the command pending on a transient patch failure", async () => {
      const { calendar, master } = await seedMaster();
      const command = await thisScopeCommand(master, "update");
      const writer = new FakeRecurringWriter();
      writer.fetchInstanceResult = providerInstance(
        "g-inst-1",
        "Old",
        "etag-1",
      );
      writer.patchError = new ProviderWriteError("transient", "blip");

      const result = await executeProviderOccurrenceUpdate(
        deps(writer),
        command,
        master,
        calendar,
        now,
      );

      expect(result.outcome.state).toBe("pending");
    });
  });

  describe("executeProviderOccurrenceDelete", () => {
    it("deletes the resolved instance at the provider and tombstones it locally", async () => {
      const { tenantId, principalId, calendar, master } = await seedMaster();
      const command = await thisScopeCommand(master, "delete");
      const writer = new FakeRecurringWriter();
      writer.fetchInstanceResult = providerInstance(
        "g-inst-1",
        "Old",
        "etag-1",
      );

      const result = await executeProviderOccurrenceDelete(
        deleteDeps(writer),
        command,
        master,
        calendar,
        now,
      );

      expect(result.outcome.state).toBe("confirmed");
      expect(writer.deleteCalls[0]?.providerEventId).toBe("g-inst-1");
      const exceptions = await events.findSeriesExceptions(
        tenantId,
        principalId,
        master._id,
      );
      expect(exceptions).toHaveLength(1);
      expect(
        exceptions[0]?.recurrence.kind === "exception" &&
          exceptions[0]?.recurrence.cancelled,
      ).toBe(true);
      // The master no longer projects the cancelled instant; the whole
      // series and every OTHER instance are untouched.
      expect(await occurrenceStartsFor(master._id)).toEqual([
        "2026-07-14T15:00:00.000Z",
        "2026-07-28T15:00:00.000Z",
      ]);
    });

    it("converges without a second provider call when the instance is already gone", async () => {
      const { tenantId, principalId, calendar, master } = await seedMaster();
      const command = await thisScopeCommand(master, "delete");
      const writer = new FakeRecurringWriter();
      writer.fetchInstanceResult = null;

      const result = await executeProviderOccurrenceDelete(
        deleteDeps(writer),
        command,
        master,
        calendar,
        now,
      );

      expect(result.outcome.state).toBe("confirmed");
      expect(writer.deleteCalls).toHaveLength(0);
      const exceptions = await events.findSeriesExceptions(
        tenantId,
        principalId,
        master._id,
      );
      expect(exceptions).toHaveLength(1);
      // Regression lock: the tombstone must NOT mirror the master's own
      // providerEventId (master.providerEventId is non-null here, since this
      // is a provider-linked series) — doing so would collide the
      // provider_event_identity unique index the master document already
      // occupies. There is no live provider counterpart, so it's null.
      expect(exceptions[0]?.providerEventId).toBeNull();
    });

    it("leaves the command pending on a transient delete failure", async () => {
      const { calendar, master } = await seedMaster();
      const command = await thisScopeCommand(master, "delete");
      const writer = new FakeRecurringWriter();
      writer.fetchInstanceResult = providerInstance(
        "g-inst-1",
        "Old",
        "etag-1",
      );
      writer.deleteError = new ProviderWriteError("transient", "blip");

      const result = await executeProviderOccurrenceDelete(
        deleteDeps(writer),
        command,
        master,
        calendar,
        now,
      );

      expect(result.outcome.state).toBe("pending");
    });
  });

  describe("executeProviderSeriesFollowingDelete", () => {
    it("truncates the provider master and drops following occurrences", async () => {
      const { tenantId, principalId, calendar, master } = await seedMaster();
      const command = await followingCommand(master, "delete");
      const writer = new FakeRecurringWriter();
      writer.fetchEventResult = providerSeries("Old", "etag-1", weekly3);

      const result = await executeProviderSeriesFollowingDelete(
        deleteDeps(writer),
        command,
        master,
        calendar,
        now,
      );

      expect(result.outcome.state).toBe("confirmed");
      expect(writer.patchCalls[0]?.recurrence.kind).toBe("series");
      // Content/schedule are unchanged — only the rules were patched.
      expect(writer.patchCalls[0]?.content.title).toBe("Old");
      const stored = await events.findById(tenantId, principalId, master._id);
      expect(stored?.recurrence.kind).toBe("seriesMaster");
      expect(await occurrenceStartsFor(master._id)).toEqual([
        "2026-07-14T15:00:00.000Z",
      ]);
    });

    it("confirms without re-patching when the truncation already landed", async () => {
      const { calendar, master } = await seedMaster();
      const command = await followingCommand(master, "delete");
      const writer = new FakeRecurringWriter();
      // Provider already reflects the truncated rules — the exact UNTIL-based
      // form truncateRulesBefore itself produces, not just an equivalent
      // COUNT-based rule (matchesIntendedEdit compares rule strings, not
      // recurrence semantics, so only this form is recognized as a replay).
      writer.fetchEventResult = providerSeries(
        "Old",
        "etag-2",
        truncateRulesBefore(weekly3, new Date(SECOND_START)),
      );

      const result = await executeProviderSeriesFollowingDelete(
        deleteDeps(writer),
        command,
        master,
        calendar,
        now,
      );

      expect(result.outcome.state).toBe("confirmed");
      expect(writer.patchCalls).toHaveLength(0);
    });

    it("collapses to the whole-series provider delete at the first occurrence", async () => {
      const { tenantId, principalId, calendar, master } = await seedMaster();
      const command = await followingCommand(
        master,
        "delete",
        "2026-07-14T09:00:00-06:00",
      );
      const writer = new FakeRecurringWriter();

      const result = await executeProviderSeriesFollowingDelete(
        deleteDeps(writer),
        command,
        master,
        calendar,
        now,
      );

      expect(result.outcome.state).toBe("confirmed");
      // executeProviderDelete's path was taken: the whole event is gone.
      expect(writer.deleteCalls).toHaveLength(1);
      expect(
        await events.findById(tenantId, principalId, master._id),
      ).toBeNull();
    });

    it("leaves the command pending on a transient patch failure", async () => {
      const { calendar, master } = await seedMaster();
      const command = await followingCommand(master, "delete");
      const writer = new FakeRecurringWriter();
      writer.fetchEventResult = providerSeries("Old", "etag-1", weekly3);
      writer.patchError = new ProviderWriteError("transient", "blip");

      const result = await executeProviderSeriesFollowingDelete(
        deleteDeps(writer),
        command,
        master,
        calendar,
        now,
      );

      expect(result.outcome.state).toBe("pending");
    });
  });

  describe("executeProviderSeriesFollowingUpdate", () => {
    it("truncates the original and creates a deterministic remainder at the provider", async () => {
      const { principalId, calendar, master } = await seedMaster();
      const command = await followingCommand(master, "update");
      const writer = new FakeRecurringWriter();
      writer.fetchEventResult = providerSeries("Old", "etag-1", weekly3);
      writer.createResult = {
        providerEventId: "g-remainder-1",
        providerVersion: "etag-1",
      };

      const result = await executeProviderSeriesFollowingUpdate(
        deps(writer),
        command,
        master,
        calendar,
        now,
      );

      expect(result.outcome.state).toBe("confirmed");
      // Original truncated to just the pre-split occurrence.
      expect(await occurrenceStartsFor(master._id)).toEqual([
        "2026-07-14T15:00:00.000Z",
      ]);
      // Remainder created at the provider with the deterministic id.
      expect(writer.createCalls).toHaveLength(1);
      const remainders = await otherSeriesMaster(principalId, master._id);
      expect(remainders).toHaveLength(1);
      expect(writer.createCalls[0]?.providerEventId).toBe(
        remainders[0]?.["_id"],
      );
      expect(remainders[0]?.["content"]).toMatchObject({ title: "Split" });
      const remainderId = remainders[0]?.["_id"] as EventId;
      expect(await occurrenceStartsFor(remainderId)).toEqual([
        SECOND_START_UTC,
        "2026-07-28T15:00:00.000Z",
      ]);
    });

    it("upserts a single remainder across two splits at the same point (idempotent retry)", async () => {
      // Two distinct commands (fresh idempotency keys), same split point —
      // mirrors the cloud path's own convergence test. The deterministic
      // remainder id (remainderMasterId) means deps.events.put upserts the
      // SAME Mongo document both times, regardless of whether each call's
      // own provider-replay check fires — that Mongo-level convergence is
      // what this test locks in.
      const { principalId, calendar, master } = await seedMaster();
      const first = await followingCommand(
        master,
        "update",
        SECOND_START,
        "First",
      );
      const writerA = new FakeRecurringWriter();
      writerA.fetchEventResult = providerSeries("Old", "etag-1", weekly3);
      await executeProviderSeriesFollowingUpdate(
        deps(writerA),
        first,
        master,
        calendar,
        now,
      );

      const second = await followingCommand(
        master,
        "update",
        SECOND_START,
        "Second",
      );
      const writerB = new FakeRecurringWriter();
      writerB.fetchEventResult = providerSeries("Old", "etag-1", weekly3);

      await executeProviderSeriesFollowingUpdate(
        deps(writerB),
        second,
        master,
        calendar,
        now,
      );

      expect(await otherSeriesMaster(principalId, master._id)).toHaveLength(1);
    });

    it("collapses to the provider edit-all at the first occurrence", async () => {
      const { tenantId, principalId, calendar, master } = await seedMaster();
      const command = await followingCommand(
        master,
        "update",
        "2026-07-14T09:00:00-06:00",
        "Whole",
      );
      const writer = new FakeRecurringWriter();
      writer.fetchEventResult = providerSeries("Old", "etag-1", weekly3);

      const result = await executeProviderSeriesFollowingUpdate(
        deps(writer),
        command,
        master,
        calendar,
        now,
      );

      expect(result.outcome.state).toBe("confirmed");
      expect(writer.createCalls).toHaveLength(0);
      const stored = await events.findById(tenantId, principalId, master._id);
      expect(stored?.content.title).toBe("Whole");
      expect(await otherSeriesMaster(principalId, master._id)).toHaveLength(0);
    });

    it("leaves the command pending on a transient create failure for the remainder", async () => {
      const { calendar, master } = await seedMaster();
      const command = await followingCommand(master, "update");
      const writer = new FakeRecurringWriter();
      writer.fetchEventResult = providerSeries("Old", "etag-1", weekly3);
      writer.createError = new ProviderWriteError("transient", "blip");

      const result = await executeProviderSeriesFollowingUpdate(
        deps(writer),
        command,
        master,
        calendar,
        now,
      );

      expect(result.outcome.state).toBe("pending");
    });
  });
});
