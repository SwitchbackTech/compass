import { faker } from "@faker-js/faker";
import { type Attendee } from "@core/types/event-attendance.contracts";
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
  executeProviderCreate,
  executeProviderDelete,
  executeProviderOccurrenceDelete,
  executeProviderOccurrenceUpdate,
  executeProviderRsvp,
  executeProviderSeriesFollowingDelete,
  executeProviderSeriesFollowingUpdate,
  executeProviderSeriesUpdate,
  executeProviderUpdate,
  type ProviderConnectionLookup,
} from "@sync/domain/provider-command.service";
import { type AccessTokenSource } from "@sync/domain/provider-write-ladder";
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
import { findSafetyCanaryHit } from "@sync/safety/safety-canary";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";
import { type ProviderCalendarRecord } from "@sync/storage/contracts/provider-calendar.contracts";
import { CommandRepository } from "@sync/storage/repositories/command.repository";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { DeletionMarkerRepository } from "@sync/storage/repositories/deletion-marker.repository";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";
import { type SyncMongoService } from "@sync/storage/sync-mongo.service";

const storage = setupSyncStorage(import.meta.url);
const objectId = () => faker.database.mongodbObjectId();

// A writer that records its calls and returns a fixed identity, or throws a
// preset error. No network.
class FakeWriter implements ProviderEventWriter {
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
  invalidateAccessToken: async () => {},
});
const failingTokenSource = (error: unknown): AccessTokenSource => ({
  getValidAccessToken: async () => {
    throw error;
  },
  discardRevoked: async () => {},
  invalidateAccessToken: async () => {},
});

// Minimal auth adapter for CredentialCustody in the revoked-grant cases.
class RevokedAuthAdapter implements ProviderAuthAdapter {
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
  let resources: SyncResourceRepository;
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
    resources = new SyncResourceRepository(mongo.db);
    calendars = new ProviderCalendarRepository(mongo.db);
  });

  const now = () => new Date("2026-07-10T00:00:00.000Z");

  it("writes to the provider, commits its identity, and confirms", async () => {
    const { tenantId, principalId, calendar, command } = await seed();
    const writer = new FakeWriter();

    const result = await executeProviderCreate(
      {
        commands,
        events,
        occurrences,
        resources,
        writer,
        custody: tokenSource(),
      },
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
    expect(stored?.providerMetadata).toBeNull();

    // The provider-linked event is projected into the read model.
    const occ = await mongo.db
      .collection(SYNC_COLLECTIONS.eventOccurrences)
      .find({ eventId: command.eventId })
      .toArray();
    expect(occ.map((o) => (o["startAt"] as Date).toISOString())).toEqual([
      "2026-07-14T15:00:00.000Z",
    ]);
  });

  it("stores iCalUID from the write result on create", async () => {
    const { tenantId, principalId, calendar, command } = await seed();
    const writer = new FakeWriter();
    writer.result = {
      providerEventId: "g-evt-1",
      providerVersion: "etag-1",
      icalUid: "g-evt-1@google.com",
    };

    await executeProviderCreate(
      {
        commands,
        events,
        occurrences,
        resources,
        writer,
        custody: tokenSource(),
      },
      command,
      calendar,
      now,
    );

    const stored = await events.findById(
      tenantId,
      principalId,
      command.eventId,
    );
    expect(stored?.providerMetadata).toEqual({ iCalUID: "g-evt-1@google.com" });
  });

  it("stores the Meet URL Google minted on create, not the command's null", async () => {
    const { tenantId, principalId, calendar, command } = await seed();
    const writer = new FakeWriter();
    writer.result = {
      providerEventId: "g-evt-1",
      providerVersion: "etag-1",
      conference: {
        url: "https://meet.google.com/abc-defg-hij",
        label: "Google Meet",
      },
    };

    await executeProviderCreate(
      {
        commands,
        events,
        occurrences,
        resources,
        writer,
        custody: tokenSource(),
      },
      command,
      calendar,
      now,
    );

    const stored = await events.findById(
      tenantId,
      principalId,
      command.eventId,
    );
    expect(
      command.input.kind === "create" && command.input.content.conference,
    ).toBe(null);
    expect(stored?.content.conference).toEqual({
      url: "https://meet.google.com/abc-defg-hij",
      label: "Google Meet",
    });
  });

  it("passes the caller's invitation intent through to the writer", async () => {
    const { calendar, command } = await seed("all");
    const writer = new FakeWriter();

    await executeProviderCreate(
      {
        commands,
        events,
        occurrences,
        resources,
        writer,
        custody: tokenSource(),
      },
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
      resources,
      writer,
      custody: tokenSource(),
    };

    await executeProviderCreate(deps, command, calendar, now);
    await executeProviderCreate(deps, command, calendar, now);

    const owned = await mongo.db
      .collection(SYNC_COLLECTIONS.events)
      .find({ tenantId, principalId, calendarId: calendar._id })
      .toArray();
    expect(owned).toHaveLength(1);
  });

  it("projects a create at the calendar's active generation, not zero", async () => {
    // 2026-08-01: a repaired calendar reads at generation 1, but creates
    // hardcoded their occurrences to generation 0, so a new event saved
    // successfully to Google and was then invisible in Compass. That was
    // meant to self-heal on the next incremental pull; when the sweeps froze,
    // the window stayed open for a day.
    const { tenantId, principalId, calendar, command } = await seed();
    const resource = await resources.ensure({
      tenantId,
      principalId,
      connectionId: calendar.connectionId,
      resourceKind: "events",
      calendarId: calendar._id,
    });
    await resources.startNewGeneration(tenantId, principalId, resource._id);
    await resources.activateGeneration(tenantId, principalId, resource._id, 1);

    await executeProviderCreate(
      {
        commands,
        events,
        occurrences,
        resources,
        writer: new FakeWriter(),
        custody: tokenSource(),
      },
      command,
      calendar,
      now,
    );

    // Visible to a read at the generation the calendar actually serves.
    const atActive = await mongo.db
      .collection(SYNC_COLLECTIONS.events)
      .find({ tenantId, principalId, calendarId: calendar._id, generation: 1 })
      .toArray();
    expect(atActive).toHaveLength(1);
    expect(atActive[0]?.["_id"]).toBe(command.eventId);
  });

  it("leaves the command pending on a transient write failure", async () => {
    const { tenantId, principalId, calendar, command } = await seed();
    const writer = new FakeWriter();
    writer.error = new ProviderWriteError("transient", "network blip");

    const result = await executeProviderCreate(
      {
        commands,
        events,
        occurrences,
        resources,
        writer,
        custody: tokenSource(),
      },
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
      {
        commands,
        events,
        occurrences,
        resources,
        writer,
        custody: tokenSource(),
      },
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
  fetched: ProviderEvent | null = null;
  fetchError?: unknown;
  patchResult: ProviderWriteResult = {
    providerEventId: "g-evt-1",
    providerVersion: "etag-2",
  };
  patchError?: unknown;
  // Fail only instance patches (edit-all override align), not the master patch.
  instancePatchError?: unknown;
  deleteError?: unknown;
  fetchCalls: ProviderFetchInput[] = [];
  patchCalls: ProviderPatchInput[] = [];
  deleteCalls: ProviderDeleteInput[] = [];
  createEvent(): Promise<ProviderWriteResult> {
    throw new Error("unused");
  }
  async patchEvent(input: ProviderPatchInput): Promise<ProviderWriteResult> {
    this.patchCalls.push(input);
    if (input.recurrence.kind === "instance" && this.instancePatchError) {
      throw this.instancePatchError;
    }
    if (this.patchError) throw this.patchError;
    return this.patchResult;
  }
  async deleteEvent(input: ProviderDeleteInput): Promise<void> {
    this.deleteCalls.push(input);
    if (this.deleteError) throw this.deleteError;
  }
  async fetchEvent(input: ProviderFetchInput): Promise<ProviderEvent | null> {
    this.fetchCalls.push(input);
    if (this.fetchError) throw this.fetchError;
    // Master replay uses `fetched`; unknown ids (e.g. discarded overrides)
    // resolve as absent so align can exercise delete's 404-OK path.
    if (
      this.fetched &&
      input.providerEventId === this.fetched.providerEventId
    ) {
      return this.fetched;
    }
    return null;
  }
  fetchInstanceAt(): Promise<ProviderEvent | null> {
    throw new Error("unused");
  }
}

describe("executeProviderUpdate", () => {
  let mongo: SyncMongoService;
  let commands: CommandRepository;
  let events: EventRepository;
  let occurrences: EventOccurrenceRepository;
  let resources: SyncResourceRepository;
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
    resources = new SyncResourceRepository(mongo.db);
    calendars = new ProviderCalendarRepository(mongo.db);
  });

  it("patches the provider and commits the new version and content", async () => {
    const { tenantId, principalId, calendar, event, command } = await seed();
    const writer = new FakeUpdateWriter();
    // The provider still holds the old content, so this is a real edit.
    writer.fetched = providerEvent("Old", "etag-1");

    const result = await executeProviderUpdate(
      {
        commands,
        events,
        occurrences,
        resources,
        writer,
        custody: tokenSource(),
      },
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
      {
        commands,
        events,
        occurrences,
        resources,
        writer,
        custody: tokenSource(),
      },
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
      {
        commands,
        events,
        occurrences,
        resources,
        writer,
        custody: tokenSource(),
      },
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
      {
        commands,
        events,
        occurrences,
        resources,
        writer,
        custody: tokenSource(),
      },
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
      {
        commands,
        events,
        occurrences,
        resources,
        writer,
        custody: tokenSource(),
      },
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
      {
        commands,
        events,
        occurrences,
        resources,
        writer,
        custody: tokenSource(),
      },
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
    edit: {
      title: string;
      recurrence: RecurrenceEdit;
      schedule?: typeof schedule;
    },
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
          schedule: edit.schedule ?? schedule,
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
    // Align the content override at the provider (do not cancel it); leave the
    // kept tombstone untouched.
    expect(writer.deleteCalls).toHaveLength(0);
    const overridePatch = writer.patchCalls.find(
      (call) => call.providerEventId === "g-inst-override",
    );
    expect(overridePatch).toMatchObject({
      providerEventId: "g-inst-override",
      expectedVersion: null,
      invitation: "all",
      calendarId: calendar.providerCalendarId,
      recurrence: { kind: "instance" },
      content: expect.objectContaining({ title: "New" }),
      schedule: {
        kind: "timed",
        start: "2026-07-21T09:00:00-06:00",
        end: "2026-07-21T10:00:00-06:00",
        timeZone: "America/Denver",
      },
    });
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

  it("leaves the override local when provider override align is transient", async () => {
    const { tenantId, principalId, calendar, master } = await seedMaster();
    const override = await putException(master, {
      providerEventId: "g-inst-override",
      recurrenceId: "2026-07-21T09:00:00-06:00",
      cancelled: false,
      title: "Moved",
    });
    const command = await editAllCommand(master, {
      title: "New",
      recurrence: { kind: "preserve" },
    });
    const writer = new FakeUpdateWriter();
    writer.fetched = providerSeries("Old", "etag-1", weekly4);
    writer.instancePatchError = new ProviderWriteError(
      "transient",
      "rate limited",
    );

    const result = await executeProviderSeriesUpdate(
      deps(writer),
      command,
      master,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("pending");
    expect(writer.deleteCalls).toHaveLength(0);
    expect(
      writer.patchCalls.some(
        (call) => call.providerEventId === "g-inst-override",
      ),
    ).toBe(true);
    expect(
      await events.findById(tenantId, principalId, override._id),
    ).not.toBeNull();
  });

  it("aligns discarded overrides to a series time change", async () => {
    const { calendar, master } = await seedMaster();
    await putException(master, {
      providerEventId: "g-inst-override",
      recurrenceId: "2026-07-21T09:00:00-06:00",
      cancelled: false,
      title: "Moved",
    });
    const movedSchedule = {
      kind: "timed" as const,
      start: "2026-07-14T10:00:00-06:00",
      end: "2026-07-14T11:00:00-06:00",
      timeZone: "America/Denver",
    };
    const command = await editAllCommand(master, {
      title: "New",
      recurrence: { kind: "preserve" },
      schedule: movedSchedule,
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
    const overridePatch = writer.patchCalls.find(
      (call) => call.providerEventId === "g-inst-override",
    );
    expect(overridePatch?.schedule).toEqual({
      kind: "timed",
      start: "2026-07-21T10:00:00-06:00",
      end: "2026-07-21T11:00:00-06:00",
      timeZone: "America/Denver",
    });
  });

  it("continues edit-all when the override is already gone at the provider", async () => {
    const { tenantId, principalId, calendar, master } = await seedMaster();
    const override = await putException(master, {
      providerEventId: "g-inst-override",
      recurrenceId: "2026-07-21T09:00:00-06:00",
      cancelled: false,
      title: "Moved",
    });
    const command = await editAllCommand(master, {
      title: "New",
      recurrence: { kind: "preserve" },
    });
    const writer = new FakeUpdateWriter();
    writer.fetched = providerSeries("Old", "etag-1", weekly4);
    writer.instancePatchError = new ProviderWriteError(
      "permanentProviderError",
      "Google rejected the write",
    );

    const result = await executeProviderSeriesUpdate(
      deps(writer),
      command,
      master,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    expect(
      writer.fetchCalls.some(
        (call) => call.providerEventId === "g-inst-override",
      ),
    ).toBe(true);
    expect(
      await events.findById(tenantId, principalId, override._id),
    ).toBeNull();
    const starts = (await masterOccurrences(master._id)).map((o) =>
      (o["startAt"] as Date).toISOString(),
    );
    expect(starts).toContain("2026-07-21T15:00:00.000Z");
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
    // Convert-to-single also cancels every discarded exception at the provider
    // (including former cancellations) so a later pull cannot resurrect them.
    expect(writer.deleteCalls).toEqual([
      expect.objectContaining({ providerEventId: "g-inst-cancelled" }),
    ]);
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
    const owned = await mongo.db
      .collection(SYNC_COLLECTIONS.events)
      .find({ tenantId, principalId, calendarId: calendar._id })
      .toArray();
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
    // Matches what the real normalizer reports for an event resolved off a
    // series via fetchInstanceAt — NOT "single". A prior version of this
    // fixture used "single", which papered over a bug where the replay
    // short-circuit could never match a real instance read.
    recurrence: {
      kind: "instance",
      seriesProviderId: "g-series-1",
      recurrenceId: SECOND_START,
    },
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
        scheduleKind: "timed",
      });
      // Patched the INSTANCE's own resolved id, never the master's.
      expect(writer.patchCalls[0]?.providerEventId).toBe("g-inst-1");
      // "instance", not "single" — Google rejects a recurrence key at all on
      // an event resolved off a series via fetchInstanceAt.
      expect(writer.patchCalls[0]?.recurrence).toEqual({ kind: "instance" });

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

    it("fails without tombstoning when the provider declines the delete (unsupportedCapability)", async () => {
      // Google 400s a well-formed instance delete for special events (e.g. a
      // contact-linked birthday occurrence). The event still exists at the
      // provider, so hiding it locally would desync until the next pull
      // resurrected it — the command fails honestly instead.
      const { tenantId, principalId, calendar, master } = await seedMaster();
      const command = await thisScopeCommand(master, "delete");
      const writer = new FakeRecurringWriter();
      writer.fetchInstanceResult = providerInstance(
        "g-inst-1",
        "Old",
        "etag-1",
      );
      writer.deleteError = new ProviderWriteError(
        "unsupportedCapability",
        "declined",
      );

      const result = await executeProviderOccurrenceDelete(
        deleteDeps(writer),
        command,
        master,
        calendar,
        now,
      );

      expect(result.outcome.state).toBe("failed");
      expect(
        result.outcome.state === "failed" && result.outcome.failureReason,
      ).toBe("unsupportedCapability");
      // No local trace of the refused delete: no cancelled exception, and the
      // occurrence still projects.
      const exceptions = await events.findSeriesExceptions(
        tenantId,
        principalId,
        master._id,
      );
      expect(exceptions).toHaveLength(0);
      expect(await occurrenceStartsFor(master._id)).toContain(SECOND_START_UTC);
    });

    it("still deletes when the resolved instance is identity-only (unreadable content)", async () => {
      const { tenantId, principalId, calendar, master } = await seedMaster();
      const command = await thisScopeCommand(master, "delete");
      const writer = new FakeRecurringWriter();
      writer.fetchInstanceResult = {
        ...providerInstance("g-inst-unreadable", "", "etag-1"),
        content: content(""),
      };

      const result = await executeProviderOccurrenceDelete(
        deleteDeps(writer),
        command,
        master,
        calendar,
        now,
      );

      expect(result.outcome.state).toBe("confirmed");
      expect(writer.deleteCalls[0]?.providerEventId).toBe("g-inst-unreadable");
      const exceptions = await events.findSeriesExceptions(
        tenantId,
        principalId,
        master._id,
      );
      expect(exceptions[0]?.providerEventId).toBe("g-inst-unreadable");
    });

    it("does not delete the series master when lookup returns the master's id", async () => {
      const { tenantId, principalId, calendar, master } = await seedMaster();
      const command = await thisScopeCommand(master, "delete");
      const writer = new FakeRecurringWriter();
      writer.fetchInstanceResult = providerSeries("Old", "etag-1", weekly3);

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
      expect(exceptions[0]?.providerEventId).toBeNull();
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

// WP-02: attendeesEdit "replace" — merge-by-email against freshly fetched
// provider state, organizer guard, replay by email set, and byte-identical
// "preserve"/legacy behavior.
describe("attendeesEdit replace", () => {
  let mongo: SyncMongoService;
  let commands: CommandRepository;
  let events: EventRepository;
  let occurrences: EventOccurrenceRepository;
  let resources: SyncResourceRepository;
  let calendars: ProviderCalendarRepository;

  const now = () => new Date("2026-07-10T00:00:00.000Z");
  const OWNER = "owner@example.com";

  const schedule = {
    kind: "timed" as const,
    start: "2026-07-14T09:00:00-06:00",
    end: "2026-07-14T10:00:00-06:00",
    timeZone: "America/Denver",
  };

  const attendee = (
    email: string,
    responseStatus: Attendee["responseStatus"] = "needsAction",
    displayName: string | null = null,
  ): Attendee => ({ email, displayName, responseStatus });

  const contentWith = (
    title: string,
    opts: {
      organizer?: { email: string; displayName: string | null } | null;
      attendees?: Attendee[];
    } = {},
  ) => ({
    title,
    description: "",
    location: null,
    organizer: opts.organizer ?? null,
    attendees: opts.attendees ?? [],
    conference: null,
  });

  const connectionsWith = (email: string | null): ProviderConnectionLookup => ({
    findById: async () => ({ account: { email } }),
  });
  const missingConnection: ProviderConnectionLookup = {
    findById: async () => null,
  };

  const deps = (
    writer: ProviderEventWriter,
    connections: ProviderConnectionLookup,
  ) => ({
    commands,
    events,
    occurrences,
    resources,
    connections,
    writer,
    custody: tokenSource(),
  });

  beforeEach(() => {
    mongo = storage.mongo();
    commands = new CommandRepository(mongo.db);
    events = new EventRepository(mongo.db);
    occurrences = new EventOccurrenceRepository(mongo.db, mongo.client);
    resources = new SyncResourceRepository(mongo.db);
    calendars = new ProviderCalendarRepository(mongo.db);
  });

  const seedCalendar = async (
    tenantId: TenantId,
    principalId: PrincipalId,
    connectionId: ConnectionId,
  ) =>
    calendars.upsertByProviderCalendar({
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

  // Seed a provider-linked single event, optionally with a stored organizer
  // and (stale) stored attendee list.
  const seedLinked = async (opts: {
    organizer?: { email: string; displayName: string | null } | null;
    storedAttendees?: Attendee[];
    recurrence?: { kind: "seriesMaster"; rules: string[] };
  }) => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const connectionId = objectId() as ConnectionId;
    const calendar = await seedCalendar(tenantId, principalId, connectionId);
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
      content: contentWith("Old", {
        organizer: opts.organizer,
        attendees: opts.storedAttendees,
      }),
      schedule,
      recurrence: opts.recurrence ?? { kind: "single" },
      lifecycleState: "active",
      generation: 0,
      createdAt: now(),
      updatedAt: now(),
      confirmedAt: now(),
    } as never);
    const event = await events.findById(tenantId, principalId, eventId);
    if (!event) throw new Error("seed failed to read back the event");
    return { tenantId, principalId, calendar, event };
  };

  const replaceCommand = async (
    event: EventRecord,
    opts: {
      title?: string;
      attendees: Attendee[];
      attendeesEdit?: "replace" | "preserve";
      scope?: string;
      recurrenceId?: string | null;
      recurrence?: unknown;
    },
  ) =>
    (
      await commands.submit({
        tenantId: event.tenantId,
        principalId: event.principalId,
        idempotencyKey: `idem-${objectId()}` as IdempotencyKey,
        eventId: event._id,
        input: {
          kind: "update",
          invitation: "all",
          attendeesEdit: opts.attendeesEdit ?? "replace",
          content: contentWith(opts.title ?? "Old", {
            attendees: opts.attendees,
          }),
          schedule,
          recurrence: opts.recurrence ?? { kind: "preserve" },
          scope: opts.scope ?? "all",
          recurrenceId: opts.recurrenceId ?? null,
        } as unknown as SyncCommandInput,
        expectedVersion: "etag-1" as never,
      })
    ).record;

  const providerSingle = (
    title: string,
    version: string,
    attendees: Attendee[],
  ): ProviderEvent => ({
    kind: "event",
    providerEventId: "g-evt-1",
    providerVersion: version,
    providerUpdatedAt: null,
    content: contentWith(title, {
      organizer: { email: OWNER, displayName: null },
      attendees,
    }),
    schedule,
    busy: true,
    recurrence: { kind: "single" },
  });

  it("merges the intent against freshly fetched provider state and patches the full set", async () => {
    // Acceptance "Normal": add one attendee to an event with three existing.
    // The stored record is STALE (everyone needsAction); the provider copy has
    // newer RSVPs that must survive the replace.
    const { tenantId, principalId, calendar, event } = await seedLinked({
      organizer: { email: OWNER, displayName: null },
      storedAttendees: [
        attendee("a@example.com"),
        attendee("b@example.com"),
        attendee("c@example.com"),
      ],
    });
    const command = await replaceCommand(event, {
      attendees: [
        attendee("a@example.com"),
        attendee("b@example.com"),
        attendee("c@example.com"),
        attendee("d@example.com", "needsAction", "Dee"),
      ],
    });
    const writer = new FakeUpdateWriter();
    writer.fetched = providerSingle("Old", "etag-1", [
      attendee("a@example.com", "accepted"),
      attendee("b@example.com", "needsAction"),
      attendee("c@example.com", "declined", "Cee"),
    ]);

    const result = await executeProviderUpdate(
      // Case-insensitive: the connection reports the account email cased
      // differently than the stored organizer.
      deps(writer, connectionsWith("Owner@Example.COM")),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    const expectedMerged = [
      attendee("a@example.com", "accepted"),
      attendee("b@example.com", "needsAction"),
      attendee("c@example.com", "declined", "Cee"),
      attendee("d@example.com", "needsAction", "Dee"),
    ];
    expect(writer.patchCalls).toHaveLength(1);
    expect(writer.patchCalls[0].attendees).toEqual(expectedMerged);
    expect(writer.patchCalls[0].invitation).toBe("all");
    // The merged membership lands on the sync record at confirm, so reads
    // reflect it before the next Google round-trip.
    const stored = await events.findById(tenantId, principalId, event._id);
    expect(stored?.content.attendees).toEqual(expectedMerged);
  });

  it("replaces with an empty set to remove every guest", async () => {
    const { tenantId, principalId, calendar, event } = await seedLinked({
      organizer: { email: OWNER, displayName: null },
      storedAttendees: [attendee("a@example.com", "accepted")],
    });
    const command = await replaceCommand(event, { attendees: [] });
    const writer = new FakeUpdateWriter();
    writer.fetched = providerSingle("Old", "etag-1", [
      attendee("a@example.com", "accepted"),
    ]);

    const result = await executeProviderUpdate(
      deps(writer, connectionsWith(OWNER)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    expect(writer.patchCalls[0].attendees).toEqual([]);
    const stored = await events.findById(tenantId, principalId, event._id);
    expect(stored?.content.attendees).toEqual([]);
  });

  it("fails a non-organizer replace typed, before any provider call", async () => {
    const { calendar, event } = await seedLinked({
      organizer: { email: "someone-else@example.com", displayName: null },
      storedAttendees: [attendee("a@example.com", "accepted")],
    });
    const command = await replaceCommand(event, {
      attendees: [attendee("a@example.com"), attendee("b@example.com")],
    });
    const writer = new FakeUpdateWriter();

    const result = await executeProviderUpdate(
      deps(writer, connectionsWith(OWNER)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome).toEqual({
      state: "failed",
      failureReason: "unsupportedCapability",
    });
    // No provider call of any kind — not even the replay-detection fetch.
    expect(writer.fetchCalls).toHaveLength(0);
    expect(writer.patchCalls).toHaveLength(0);
    // The failure surface the command route logs from (and the SSE notices
    // derive from) carries no attendee JSON or event content.
    expect(findSafetyCanaryHit(result.outcome)).toBeNull();
    expect(
      findSafetyCanaryHit(
        `Command ${result._id} (${result.input.kind} ${result.eventId}) failed: ${
          result.outcome.state === "failed" && result.outcome.failureReason
        }`,
      ),
    ).toBeNull();
  });

  it("fails closed when the connection cannot be resolved", async () => {
    const { calendar, event } = await seedLinked({
      organizer: { email: OWNER, displayName: null },
    });
    const command = await replaceCommand(event, {
      attendees: [attendee("a@example.com")],
    });
    const writer = new FakeUpdateWriter();

    const result = await executeProviderUpdate(
      deps(writer, missingConnection),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome).toEqual({
      state: "failed",
      failureReason: "unsupportedCapability",
    });
    expect(writer.fetchCalls).toHaveLength(0);
  });

  it("allows a replace when no organizer is stored yet", async () => {
    // A Compass-created event that has never had guests carries no organizer;
    // the connection's own account organizes it.
    const { calendar, event } = await seedLinked({ organizer: null });
    const command = await replaceCommand(event, {
      attendees: [attendee("a@example.com")],
    });
    const writer = new FakeUpdateWriter();
    writer.fetched = providerSingle("Old", "etag-1", []);

    const result = await executeProviderUpdate(
      deps(writer, connectionsWith(OWNER)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    expect(writer.patchCalls[0].attendees).toEqual([attendee("a@example.com")]);
  });

  it("confirms a landed attendee-only edit on replay — email sets, order- and status-insensitive", async () => {
    const { calendar, event } = await seedLinked({
      organizer: { email: OWNER, displayName: null },
      storedAttendees: [attendee("a@example.com")],
    });
    const command = await replaceCommand(event, {
      attendees: [attendee("a@example.com"), attendee("b@example.com")],
    });
    const writer = new FakeUpdateWriter();
    // The prior attempt landed; since then the provider reordered the list
    // and one guest RSVP'd. Same membership => replay, never a second write.
    writer.fetched = providerSingle("Old", "etag-7", [
      attendee("b@example.com", "accepted"),
      attendee("A@Example.com", "declined"),
    ]);

    const result = await executeProviderUpdate(
      deps(writer, connectionsWith(OWNER)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    expect(writer.patchCalls).toHaveLength(0);
    expect(
      result.outcome.state === "confirmed" && result.outcome.providerVersion,
    ).toBe("etag-7");
  });

  it("still patches when the landed membership differs from the intent", async () => {
    const { calendar, event } = await seedLinked({
      organizer: { email: OWNER, displayName: null },
    });
    const command = await replaceCommand(event, {
      attendees: [attendee("a@example.com"), attendee("b@example.com")],
    });
    const writer = new FakeUpdateWriter();
    writer.fetched = providerSingle("Old", "etag-1", [
      attendee("a@example.com", "accepted"),
      attendee("c@example.com", "accepted"),
    ]);

    const result = await executeProviderUpdate(
      deps(writer, connectionsWith(OWNER)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    expect(writer.patchCalls).toHaveLength(1);
    expect(writer.patchCalls[0].attendees).toEqual([
      attendee("a@example.com", "accepted"),
      attendee("b@example.com"),
    ]);
  });

  it("keeps a preserve command byte-identical: no attendees on the patch, stored list untouched", async () => {
    const storedAttendees = [attendee("kept@example.com", "accepted")];
    const { tenantId, principalId, calendar, event } = await seedLinked({
      organizer: { email: OWNER, displayName: null },
      storedAttendees,
    });
    // The browser echoes full content on legacy updates — attendees included —
    // but "preserve" must not turn that into a guest write.
    const command = await replaceCommand(event, {
      title: "Renamed",
      attendees: [attendee("stray@example.com")],
      attendeesEdit: "preserve",
    });
    const writer = new FakeUpdateWriter();
    writer.fetched = providerSingle("Old", "etag-1", [
      attendee("kept@example.com", "accepted"),
      attendee("provider-only@example.com", "tentative"),
    ]);

    const result = await executeProviderUpdate(
      deps(writer, connectionsWith(OWNER)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    expect(writer.patchCalls).toHaveLength(1);
    expect(writer.patchCalls[0]).not.toHaveProperty("attendees");
    expect(writer.patchCalls[0].content.attendees).toEqual(storedAttendees);
    // The stored record keeps its own attendee list (mergeUpdateContent), not
    // the command's echoed one.
    const stored = await events.findById(tenantId, principalId, event._id);
    expect(stored?.content.attendees).toEqual(storedAttendees);
    expect(stored?.content.title).toBe("Renamed");
  });

  it("leaves a replace pending on a transient fetch failure, with no patch", async () => {
    // Acceptance "Tool failure": the provider fetch fails transiently.
    const { calendar, event } = await seedLinked({
      organizer: { email: OWNER, displayName: null },
    });
    const command = await replaceCommand(event, {
      attendees: [attendee("a@example.com")],
    });
    const writer = new FakeUpdateWriter();
    writer.fetchError = new ProviderWriteError("transient", "blip");

    const result = await executeProviderUpdate(
      deps(writer, connectionsWith(OWNER)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("pending");
    expect(writer.patchCalls).toHaveLength(0);
  });

  it("merges and patches the guest list on a series edit-all", async () => {
    const weekly4 = ["RRULE:FREQ=WEEKLY;COUNT=4"];
    const { tenantId, principalId, calendar, event } = await seedLinked({
      organizer: { email: OWNER, displayName: null },
      storedAttendees: [attendee("a@example.com")],
      recurrence: { kind: "seriesMaster", rules: weekly4 },
    });
    const command = await replaceCommand(event, {
      attendees: [attendee("a@example.com"), attendee("b@example.com")],
    });
    const writer = new FakeUpdateWriter();
    writer.fetched = {
      ...providerSingle("Old", "etag-1", [
        attendee("a@example.com", "accepted"),
      ]),
      recurrence: { kind: "seriesMaster", rules: weekly4 },
    };

    const result = await executeProviderSeriesUpdate(
      deps(writer, connectionsWith(OWNER)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    expect(writer.patchCalls).toHaveLength(1);
    expect(writer.patchCalls[0].attendees).toEqual([
      attendee("a@example.com", "accepted"),
      attendee("b@example.com"),
    ]);
    const stored = await events.findById(tenantId, principalId, event._id);
    expect(stored?.content.attendees).toEqual([
      attendee("a@example.com", "accepted"),
      attendee("b@example.com"),
    ]);
  });

  it("fails a non-organizer series edit-all replace before any provider call", async () => {
    const { calendar, event } = await seedLinked({
      organizer: { email: "someone-else@example.com", displayName: null },
      recurrence: {
        kind: "seriesMaster",
        rules: ["RRULE:FREQ=WEEKLY;COUNT=4"],
      },
    });
    const command = await replaceCommand(event, {
      attendees: [attendee("a@example.com")],
    });
    const writer = new FakeUpdateWriter();

    const result = await executeProviderSeriesUpdate(
      deps(writer, connectionsWith(OWNER)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome).toEqual({
      state: "failed",
      failureReason: "unsupportedCapability",
    });
    expect(writer.fetchCalls).toHaveLength(0);
    expect(writer.patchCalls).toHaveLength(0);
  });

  it("refuses a replace on a scope-this occurrence edit (whole-event only in v1)", async () => {
    const { calendar, event } = await seedLinked({
      organizer: { email: OWNER, displayName: null },
      recurrence: {
        kind: "seriesMaster",
        rules: ["RRULE:FREQ=WEEKLY;COUNT=4"],
      },
    });
    const command = await replaceCommand(event, {
      attendees: [attendee("a@example.com")],
      scope: "this",
      recurrenceId: "2026-07-21T15:00:00.000Z",
    });
    const writer = new FakeUpdateWriter();

    const result = await executeProviderOccurrenceUpdate(
      deps(writer, connectionsWith(OWNER)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome).toEqual({
      state: "failed",
      failureReason: "unsupportedCapability",
    });
    expect(writer.patchCalls).toHaveLength(0);
  });

  it("refuses a replace on a thisAndFollowing split", async () => {
    const { tenantId, principalId, calendar, event } = await seedLinked({
      organizer: { email: OWNER, displayName: null },
      recurrence: {
        kind: "seriesMaster",
        rules: ["RRULE:FREQ=WEEKLY;COUNT=4"],
      },
    });
    const command = await replaceCommand(event, {
      attendees: [attendee("a@example.com")],
      scope: "thisAndFollowing",
      recurrenceId: "2026-07-21T15:00:00.000Z",
    });
    const writer = new FakeUpdateWriter();

    const result = await executeProviderSeriesFollowingUpdate(
      deps(writer, connectionsWith(OWNER)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome).toEqual({
      state: "failed",
      failureReason: "unsupportedCapability",
    });
    expect(writer.patchCalls).toHaveLength(0);
    // Refused before the split touched anything: the master's rules are
    // untruncated.
    const stored = await events.findById(tenantId, principalId, event._id);
    expect(stored?.recurrence).toEqual({
      kind: "seriesMaster",
      rules: ["RRULE:FREQ=WEEKLY;COUNT=4"],
    });
  });

  it("emits every intended guest as needsAction on create and stores them", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const connectionId = objectId() as ConnectionId;
    const calendar = await seedCalendar(tenantId, principalId, connectionId);
    const { record: command } = await commands.submit({
      tenantId,
      principalId,
      idempotencyKey: `idem-${objectId()}` as IdempotencyKey,
      eventId: objectId() as EventId,
      input: {
        kind: "create",
        calendarId: calendar._id,
        invitation: "all",
        attendeesEdit: "replace",
        // The command may carry stray statuses; a create normalizes every
        // guest to needsAction (nobody has answered a brand-new invitation).
        content: contentWith("Kickoff", {
          attendees: [
            attendee("a@example.com", "accepted", "Aye"),
            attendee("b@example.com"),
          ],
        }),
        schedule,
        recurrence: { kind: "single" },
      } as unknown as SyncCommandInput,
      expectedVersion: null,
    });
    const writer = new FakeWriter();

    const result = await executeProviderCreate(
      deps(writer, connectionsWith(OWNER)),
      command,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    const expected = [
      attendee("a@example.com", "needsAction", "Aye"),
      attendee("b@example.com"),
    ];
    expect(writer.calls).toHaveLength(1);
    expect(writer.calls[0].attendees).toEqual(expected);
    expect(writer.calls[0].invitation).toBe("all");
    const stored = await events.findById(
      tenantId,
      principalId,
      command.eventId,
    );
    expect(stored?.content.attendees).toEqual(expected);
  });

  it("keeps a legacy create byte-identical: no attendees on the provider write", async () => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const connectionId = objectId() as ConnectionId;
    const calendar = await seedCalendar(tenantId, principalId, connectionId);
    const { record: command } = await commands.submit({
      tenantId,
      principalId,
      idempotencyKey: `idem-${objectId()}` as IdempotencyKey,
      eventId: objectId() as EventId,
      // No attendeesEdit: the schema defaults it to "preserve" (legacy).
      input: {
        kind: "create",
        calendarId: calendar._id,
        invitation: "none",
        content: contentWith("Plain"),
        schedule,
        recurrence: { kind: "single" },
      } as unknown as SyncCommandInput,
      expectedVersion: null,
    });
    const writer = new FakeWriter();

    const result = await executeProviderCreate(
      deps(writer, connectionsWith(OWNER)),
      command,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    expect(command.input.kind === "create" && command.input.attendeesEdit).toBe(
      "preserve",
    );
    expect(writer.calls[0]).not.toHaveProperty("attendees");
  });
});

// WP-07: rsvp command execution — rewrite ONLY the self attendee entry
// (matched case-insensitively by the connection's account email) against
// freshly fetched provider state, patch the full merged list with
// sendUpdates "none", target the master for scope "all" and the resolved
// Google instance for scope "this", replay without a second write, and fail
// typed (unsupportedCapability) on every guard.
describe("executeProviderRsvp", () => {
  let mongo: SyncMongoService;
  let commands: CommandRepository;
  let events: EventRepository;
  let occurrences: EventOccurrenceRepository;
  let resources: SyncResourceRepository;
  let calendars: ProviderCalendarRepository;

  const now = () => new Date("2026-07-10T00:00:00.000Z");
  const SELF = "self@example.com";

  const schedule = {
    kind: "timed" as const,
    start: "2026-07-14T09:00:00-06:00",
    end: "2026-07-14T10:00:00-06:00",
    timeZone: "America/Denver",
  };
  const weekly3 = ["RRULE:FREQ=WEEKLY;COUNT=3"];
  const SECOND_START_UTC = "2026-07-21T15:00:00.000Z";

  const attendee = (
    email: string,
    responseStatus: Attendee["responseStatus"] = "needsAction",
    displayName: string | null = null,
  ): Attendee => ({ email, displayName, responseStatus });

  const contentWith = (
    title: string,
    opts: {
      organizer?: { email: string; displayName: string | null } | null;
      attendees?: Attendee[];
      color?: string;
    } = {},
  ) => ({
    title,
    description: "",
    location: null,
    organizer: opts.organizer ?? null,
    attendees: opts.attendees ?? [],
    conference: null,
    ...(opts.color ? { color: opts.color } : {}),
  });

  const connectionsWith = (email: string | null): ProviderConnectionLookup => ({
    findById: async () => ({ account: { email } }),
  });
  const missingConnection: ProviderConnectionLookup = {
    findById: async () => null,
  };

  const deps = (
    writer: ProviderEventWriter,
    connections: ProviderConnectionLookup,
  ) => ({
    commands,
    events,
    occurrences,
    resources,
    connections,
    writer,
    custody: tokenSource(),
  });

  beforeEach(() => {
    mongo = storage.mongo();
    commands = new CommandRepository(mongo.db);
    events = new EventRepository(mongo.db);
    occurrences = new EventOccurrenceRepository(mongo.db, mongo.client);
    resources = new SyncResourceRepository(mongo.db);
    calendars = new ProviderCalendarRepository(mongo.db);
  });

  const seedCalendar = async (
    tenantId: TenantId,
    principalId: PrincipalId,
    connectionId: ConnectionId,
  ) =>
    calendars.upsertByProviderCalendar({
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

  // Seed a provider-linked event the account is invited to (stored guest
  // list includes SELF by default).
  const seedLinked = async (
    opts: {
      organizer?: { email: string; displayName: string | null } | null;
      storedAttendees?: Attendee[];
      recurrence?: { kind: "seriesMaster"; rules: string[] };
    } = {},
  ) => {
    const tenantId = objectId() as TenantId;
    const principalId = objectId() as PrincipalId;
    const connectionId = objectId() as ConnectionId;
    const calendar = await seedCalendar(tenantId, principalId, connectionId);
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
      content: contentWith("Invited", {
        organizer: opts.organizer ?? {
          email: "organizer@example.com",
          displayName: null,
        },
        attendees: opts.storedAttendees ?? [
          attendee("organizer@example.com", "accepted"),
          attendee(SELF, "accepted"),
        ],
      }),
      schedule,
      recurrence: opts.recurrence ?? { kind: "single" },
      lifecycleState: "active",
      generation: 0,
      createdAt: now(),
      updatedAt: now(),
      confirmedAt: now(),
    } as never);
    const event = await events.findById(tenantId, principalId, eventId);
    if (!event) throw new Error("seed failed to read back the event");
    return { tenantId, principalId, calendar, event };
  };

  const rsvpCommand = async (
    event: EventRecord,
    opts: {
      responseStatus?: "accepted" | "declined" | "tentative";
      scope?: string;
      recurrenceId?: string | null;
    } = {},
  ) =>
    (
      await commands.submit({
        tenantId: event.tenantId,
        principalId: event.principalId,
        idempotencyKey: `idem-${objectId()}` as IdempotencyKey,
        eventId: event._id,
        input: {
          kind: "rsvp",
          responseStatus: opts.responseStatus ?? "declined",
          scope: opts.scope ?? "all",
          recurrenceId: opts.recurrenceId ?? null,
        } as unknown as SyncCommandInput,
        expectedVersion: null,
      })
    ).record;

  const providerSingle = (
    version: string,
    attendees: Attendee[],
    opts: { color?: string } = {},
  ): ProviderEvent => ({
    kind: "event",
    providerEventId: "g-evt-1",
    providerVersion: version,
    providerUpdatedAt: null,
    content: contentWith("Invited", {
      organizer: { email: "organizer@example.com", displayName: null },
      attendees,
      color: opts.color,
    }) as ProviderEvent["content"],
    schedule,
    busy: true,
    recurrence: { kind: "single" },
  });

  it("rewrites only the self entry (case-insensitive) and patches the full list with sendUpdates none", async () => {
    // Acceptance "Normal": accepted → declined on a single event. The
    // account email is cased differently than the provider's entry, and the
    // provider list carries fresher sibling RSVPs than the stored copy.
    const { tenantId, principalId, calendar, event } = await seedLinked();
    const command = await rsvpCommand(event, { responseStatus: "declined" });
    const writer = new FakeUpdateWriter();
    const fetchedList = [
      attendee("organizer@example.com", "accepted", "Org"),
      attendee("Self@Example.COM", "accepted"),
      attendee("other@example.com", "tentative", "Oth"),
    ];
    writer.fetched = providerSingle("etag-1", fetchedList, { color: "coral" });

    const result = await executeProviderRsvp(
      deps(writer, connectionsWith(SELF)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    expect(writer.patchCalls).toHaveLength(1);
    const patch = writer.patchCalls[0];
    // The full merged list rides the attendee body emission: only the self
    // entry's responseStatus changed; every other entry — and the self
    // entry's own email casing and displayName — is byte-identical to the
    // freshly fetched provider state.
    expect(patch.attendees).toEqual([
      attendee("organizer@example.com", "accepted", "Org"),
      attendee("Self@Example.COM", "declined"),
      attendee("other@example.com", "tentative", "Oth"),
    ]);
    expect(patch.attendees?.[0]).toEqual(fetchedList[0] as Attendee);
    expect(patch.attendees?.[2]).toEqual(fetchedList[2] as Attendee);
    // Never emails the guest list, and never conditions on a version: a
    // concurrent sibling RSVP must not block this one.
    expect(patch.invitation).toBe("none");
    expect(patch.expectedVersion).toBeNull();
    expect(patch.providerEventId).toBe("g-evt-1");
    // The echoed body carries the fetched content minus color/colorHex, so
    // the patch cannot touch Google's color or label state.
    expect(patch.content.title).toBe("Invited");
    expect(patch.content).not.toHaveProperty("color");
    expect(patch.content).not.toHaveProperty("colorHex");

    // The answer lands on the stored record before the next Google
    // round-trip.
    const stored = await events.findById(tenantId, principalId, event._id);
    expect(stored?.content.attendees).toEqual([
      attendee("organizer@example.com", "accepted", "Org"),
      attendee("Self@Example.COM", "declined"),
      attendee("other@example.com", "tentative", "Oth"),
    ]);
    expect(stored?.providerVersion).toBe("etag-2");
    expect(
      result.outcome.state === "confirmed" && result.outcome.providerVersion,
    ).toBe("etag-2");
  });

  it("confirms a replay without a second write when the provider already holds the answer", async () => {
    const { calendar, event } = await seedLinked();
    const command = await rsvpCommand(event, { responseStatus: "tentative" });
    const writer = new FakeUpdateWriter();
    // The prior attempt landed (or the user answered from another client).
    writer.fetched = providerSingle("etag-7", [
      attendee("organizer@example.com", "accepted"),
      attendee(SELF, "tentative"),
    ]);

    const result = await executeProviderRsvp(
      deps(writer, connectionsWith(SELF)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    expect(writer.patchCalls).toHaveLength(0);
    expect(
      result.outcome.state === "confirmed" && result.outcome.providerVersion,
    ).toBe("etag-7");
  });

  it("allows the organizer to RSVP their own event", async () => {
    // Finish line 4: no organizer guard here — Google lists the organizer as
    // an attendee of their own event, and answering it is theirs to do.
    const { calendar, event } = await seedLinked({
      organizer: { email: SELF, displayName: null },
      storedAttendees: [
        attendee(SELF, "accepted"),
        attendee("guest@example.com", "needsAction"),
      ],
    });
    const command = await rsvpCommand(event, { responseStatus: "tentative" });
    const writer = new FakeUpdateWriter();
    writer.fetched = providerSingle("etag-1", [
      attendee(SELF, "accepted"),
      attendee("guest@example.com", "needsAction"),
    ]);

    const result = await executeProviderRsvp(
      deps(writer, connectionsWith(SELF)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    expect(writer.patchCalls[0].attendees).toEqual([
      attendee(SELF, "tentative"),
      attendee("guest@example.com", "needsAction"),
    ]);
  });

  it("fails typed when the account is not in the stored guest list, with no provider call", async () => {
    // Acceptance "Policy": self not an attendee → unsupportedCapability
    // BEFORE any provider call, and no attendee JSON anywhere the route
    // logs from.
    const { calendar, event } = await seedLinked({
      storedAttendees: [
        attendee("organizer@example.com", "accepted"),
        attendee("someone-else@example.com", "needsAction"),
      ],
    });
    const command = await rsvpCommand(event);
    const writer = new FakeUpdateWriter();

    const result = await executeProviderRsvp(
      deps(writer, connectionsWith(SELF)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome).toEqual({
      state: "failed",
      failureReason: "unsupportedCapability",
    });
    expect(writer.fetchCalls).toHaveLength(0);
    expect(writer.patchCalls).toHaveLength(0);
    expect(findSafetyCanaryHit(result.outcome)).toBeNull();
    expect(
      findSafetyCanaryHit(
        `Command ${result._id} (${result.input.kind} ${result.eventId}) failed: ${
          result.outcome.state === "failed" && result.outcome.failureReason
        }`,
      ),
    ).toBeNull();
  });

  it("fails closed when the connection cannot be resolved", async () => {
    const { calendar, event } = await seedLinked();
    const command = await rsvpCommand(event);
    const writer = new FakeUpdateWriter();

    const result = await executeProviderRsvp(
      deps(writer, missingConnection),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome).toEqual({
      state: "failed",
      failureReason: "unsupportedCapability",
    });
    expect(writer.fetchCalls).toHaveLength(0);
  });

  it("fails closed when the connection has no account email", async () => {
    const { calendar, event } = await seedLinked();
    const command = await rsvpCommand(event);
    const writer = new FakeUpdateWriter();

    const result = await executeProviderRsvp(
      deps(writer, connectionsWith(null)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome).toEqual({
      state: "failed",
      failureReason: "unsupportedCapability",
    });
    expect(writer.fetchCalls).toHaveLength(0);
  });

  it("fails typed when the provider no longer lists the account, without writing", async () => {
    // The stored list still has SELF, but the fetched state does not
    // (uninvited provider-side since the last pull): same typed refusal,
    // discovered after the fetch — never a write.
    const { calendar, event } = await seedLinked();
    const command = await rsvpCommand(event);
    const writer = new FakeUpdateWriter();
    writer.fetched = providerSingle("etag-3", [
      attendee("organizer@example.com", "accepted"),
    ]);

    const result = await executeProviderRsvp(
      deps(writer, connectionsWith(SELF)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome).toEqual({
      state: "failed",
      failureReason: "unsupportedCapability",
    });
    expect(writer.fetchCalls).toHaveLength(1);
    expect(writer.patchCalls).toHaveLength(0);
  });

  it("leaves the command pending on a transient fetch failure, with no patch", async () => {
    // Acceptance "Tool failure": fetch 5xx → the command stays retryable.
    const { calendar, event } = await seedLinked();
    const command = await rsvpCommand(event);
    const writer = new FakeUpdateWriter();
    writer.fetchError = new ProviderWriteError("transient", "blip");

    const result = await executeProviderRsvp(
      deps(writer, connectionsWith(SELF)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("pending");
    expect(writer.patchCalls).toHaveLength(0);
  });

  it("fails permanently when nothing live exists to answer", async () => {
    const { calendar, event } = await seedLinked();
    const command = await rsvpCommand(event);
    const writer = new FakeUpdateWriter();
    writer.fetched = null;

    const result = await executeProviderRsvp(
      deps(writer, connectionsWith(SELF)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome).toEqual({
      state: "failed",
      failureReason: "permanentProviderError",
    });
    expect(writer.patchCalls).toHaveLength(0);
  });

  // --- instance-vs-master targeting -----------------------------------------

  const providerInstance = (attendees: Attendee[]): ProviderEvent => ({
    kind: "event",
    providerEventId: "g-inst-1",
    providerVersion: "etag-inst-1",
    providerUpdatedAt: null,
    content: contentWith("Invited", {
      organizer: { email: "organizer@example.com", displayName: null },
      attendees,
    }) as ProviderEvent["content"],
    schedule: {
      kind: "timed",
      start: "2026-07-21T09:00:00-06:00",
      end: "2026-07-21T10:00:00-06:00",
      timeZone: "America/Denver",
    },
    busy: true,
    recurrence: {
      kind: "instance",
      seriesProviderId: "g-evt-1",
      recurrenceId: SECOND_START_UTC,
    },
  });

  it("patches the resolved Google instance on a scope-this rsvp, leaving the master untouched", async () => {
    // Acceptance "Normal": declined on ONE occurrence leaves the master and
    // sibling occurrences untouched. The instance id comes from the writer's
    // own fetchInstanceAt resolution — never hand-built.
    const { tenantId, principalId, calendar, event } = await seedLinked({
      recurrence: { kind: "seriesMaster", rules: weekly3 },
    });
    const command = await rsvpCommand(event, {
      responseStatus: "declined",
      scope: "this",
      recurrenceId: SECOND_START_UTC,
    });
    const writer = new FakeRecurringWriter();
    writer.fetchInstanceResult = providerInstance([
      attendee("organizer@example.com", "accepted"),
      attendee(SELF, "accepted"),
    ]);
    writer.patchResult = {
      providerEventId: "g-inst-1",
      providerVersion: "etag-inst-2",
    };

    const result = await executeProviderRsvp(
      deps(writer, connectionsWith(SELF)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    // The occurrence was resolved off the series via fetchInstanceAt, by the
    // master's provider id and the occurrence's original start.
    expect(writer.fetchInstanceCalls).toHaveLength(1);
    expect(writer.fetchInstanceCalls[0]).toMatchObject({
      calendarId: calendar.providerCalendarId,
      seriesProviderEventId: "g-evt-1",
      originalStartAt: SECOND_START_UTC,
      scheduleKind: "timed",
    });
    // The master itself was never fetched and never patched: the single
    // patch targets the RESOLVED instance id, with no recurrence key.
    expect(writer.fetchEventCalls).toHaveLength(0);
    expect(writer.patchCalls).toHaveLength(1);
    expect(writer.patchCalls[0].providerEventId).toBe("g-inst-1");
    expect(writer.patchCalls[0].recurrence).toEqual({ kind: "instance" });
    expect(writer.patchCalls[0].invitation).toBe("none");
    expect(writer.patchCalls[0].attendees).toEqual([
      attendee("organizer@example.com", "accepted"),
      attendee(SELF, "declined"),
    ]);

    // Locally: the master's stored guest list is untouched; the answer lives
    // on the instance's exception record, carrying the instance's own
    // provider identity.
    const master = await events.findById(tenantId, principalId, event._id);
    expect(master?.content.attendees).toEqual([
      attendee("organizer@example.com", "accepted"),
      attendee(SELF, "accepted"),
    ]);
    expect(master?.providerVersion).toBe("etag-1");
    const exceptions = await events.findSeriesExceptions(
      tenantId,
      principalId,
      event._id,
    );
    expect(exceptions).toHaveLength(1);
    expect(exceptions[0]?.providerEventId).toBe("g-inst-1");
    expect(exceptions[0]?.providerVersion).toBe("etag-inst-2");
    expect(exceptions[0]?.content.attendees).toEqual([
      attendee("organizer@example.com", "accepted"),
      attendee(SELF, "declined"),
    ]);

    // Sibling occurrences are untouched: the master still projects 07-14 and
    // 07-28, and the answered instant projects from the exception.
    const masterRows = await mongo.db
      .collection(SYNC_COLLECTIONS.eventOccurrences)
      .find({ eventId: event._id })
      .toArray();
    expect(
      masterRows.map((row) => (row["startAt"] as Date).toISOString()).sort(),
    ).toEqual(["2026-07-14T15:00:00.000Z", "2026-07-28T15:00:00.000Z"]);
    const exceptionRows = await mongo.db
      .collection(SYNC_COLLECTIONS.eventOccurrences)
      .find({ eventId: exceptions[0]?._id })
      .toArray();
    expect(
      exceptionRows.map((row) => (row["startAt"] as Date).toISOString()),
    ).toEqual([SECOND_START_UTC]);
  });

  it("patches the series master on a scope-all rsvp, never resolving an instance", async () => {
    // The other half of the targeting proof: "all events" answers on the
    // master itself.
    const { tenantId, principalId, calendar, event } = await seedLinked({
      recurrence: { kind: "seriesMaster", rules: weekly3 },
    });
    const command = await rsvpCommand(event, { responseStatus: "declined" });
    const writer = new FakeRecurringWriter();
    writer.fetchEventResult = {
      ...providerSingle("etag-1", [
        attendee("organizer@example.com", "accepted"),
        attendee(SELF, "accepted"),
      ]),
      recurrence: { kind: "seriesMaster", rules: weekly3 },
    };
    writer.patchResult = {
      providerEventId: "g-evt-1",
      providerVersion: "etag-2",
    };

    const result = await executeProviderRsvp(
      deps(writer, connectionsWith(SELF)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    expect(writer.fetchInstanceCalls).toHaveLength(0);
    expect(writer.fetchEventCalls).toHaveLength(1);
    expect(writer.patchCalls).toHaveLength(1);
    expect(writer.patchCalls[0].providerEventId).toBe("g-evt-1");
    // The master's own current rules are re-written unchanged
    // (self-describing), mirroring how a "preserve" series edit writes.
    expect(writer.patchCalls[0].recurrence).toEqual({
      kind: "series",
      rules: weekly3,
    });
    expect(writer.patchCalls[0].attendees).toEqual([
      attendee("organizer@example.com", "accepted"),
      attendee(SELF, "declined"),
    ]);
    const master = await events.findById(tenantId, principalId, event._id);
    expect(master?.content.attendees).toEqual([
      attendee("organizer@example.com", "accepted"),
      attendee(SELF, "declined"),
    ]);
  });

  it("keeps a scope-all rsvp from resurrecting a cancelled occurrence", async () => {
    // The commit reprojects through reprojectMaster, so a previously deleted
    // occurrence's instant stays excluded.
    const { calendar, event } = await seedLinked({
      recurrence: { kind: "seriesMaster", rules: weekly3 },
    });
    await events.upsertException(
      event,
      SECOND_START_UTC as never,
      {
        content: event.content,
        schedule,
        cancelled: true,
        providerIdentity: null,
      },
      now(),
    );
    const command = await rsvpCommand(event, { responseStatus: "declined" });
    const writer = new FakeRecurringWriter();
    writer.fetchEventResult = {
      ...providerSingle("etag-1", [attendee(SELF, "accepted")]),
      recurrence: { kind: "seriesMaster", rules: weekly3 },
    };

    const result = await executeProviderRsvp(
      deps(writer, connectionsWith(SELF)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    const masterRows = await mongo.db
      .collection(SYNC_COLLECTIONS.eventOccurrences)
      .find({ eventId: event._id })
      .toArray();
    expect(
      masterRows.map((row) => (row["startAt"] as Date).toISOString()).sort(),
    ).toEqual(["2026-07-14T15:00:00.000Z", "2026-07-28T15:00:00.000Z"]);
  });

  it("confirms a scope-this replay without a second write when the instance already holds the answer", async () => {
    const { tenantId, principalId, calendar, event } = await seedLinked({
      recurrence: { kind: "seriesMaster", rules: weekly3 },
    });
    const command = await rsvpCommand(event, {
      responseStatus: "declined",
      scope: "this",
      recurrenceId: SECOND_START_UTC,
    });
    const writer = new FakeRecurringWriter();
    writer.fetchInstanceResult = providerInstance([attendee(SELF, "declined")]);

    const result = await executeProviderRsvp(
      deps(writer, connectionsWith(SELF)),
      command,
      event,
      calendar,
      now,
    );

    expect(result.outcome.state).toBe("confirmed");
    expect(writer.patchCalls).toHaveLength(0);
    expect(
      result.outcome.state === "confirmed" && result.outcome.providerVersion,
    ).toBe("etag-inst-1");
    // The already-landed answer still converges locally onto the exception.
    const exceptions = await events.findSeriesExceptions(
      tenantId,
      principalId,
      event._id,
    );
    expect(exceptions).toHaveLength(1);
    expect(exceptions[0]?.content.attendees).toEqual([
      attendee(SELF, "declined"),
    ]);
  });
});
