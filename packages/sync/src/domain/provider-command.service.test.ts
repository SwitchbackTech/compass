import { faker } from "@faker-js/faker";
import { type SyncCommandInput } from "@core/types/sync/command.contracts";
import {
  type ConnectionId,
  type EventId,
  type IdempotencyKey,
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import {
  type AccessTokenSource,
  executeProviderCreate,
} from "@sync/domain/provider-command.service";
import { ProviderAuthError } from "@sync/providers/provider-auth.port";
import {
  type ProviderCreateInput,
  type ProviderEventWriter,
  ProviderWriteError,
  type ProviderWriteResult,
} from "@sync/providers/provider-event-writer.port";
import { type ProviderCalendarRecord } from "@sync/storage/contracts/provider-calendar.contracts";
import { CommandRepository } from "@sync/storage/repositories/command.repository";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { SyncMongoService } from "@sync/storage/sync-mongo.service";

const uri = process.env["SYNC_MONGO_URI"] as string;
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
});
const failingTokenSource = (error: unknown): AccessTokenSource => ({
  getValidAccessToken: async () => {
    throw error;
  },
});

describe("executeProviderCreate", () => {
  let mongo: SyncMongoService;
  let commands: CommandRepository;
  let events: EventRepository;
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
    const command = await commands.submit({
      tenantId,
      principalId,
      idempotencyKey: `idem-${objectId()}` as IdempotencyKey,
      eventId: objectId() as EventId,
      input: createInput(calendar._id, invitation),
      expectedVersion: null,
    });
    return { tenantId, principalId, calendar, command };
  };

  beforeEach(async () => {
    mongo = new SyncMongoService();
    await mongo.connect({
      uri,
      databaseName: `provcmd_${objectId()}`,
      forbiddenDatabaseName: "compass_api_unused",
      enforceLeastPrivilege: false,
    });
    commands = new CommandRepository(mongo.db);
    events = new EventRepository(mongo.db);
    calendars = new ProviderCalendarRepository(mongo.db);
  });

  afterEach(async () => {
    await mongo.db.dropDatabase();
    await mongo.disconnect();
  });

  const now = () => new Date("2026-07-10T00:00:00.000Z");

  it("writes to the provider, commits its identity, and confirms", async () => {
    const { tenantId, principalId, calendar, command } = await seed();
    const writer = new FakeWriter();

    const result = await executeProviderCreate(
      { commands, events, writer, custody: tokenSource() },
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
  });

  it("passes the caller's invitation intent through to the writer", async () => {
    const { calendar, command } = await seed("all");
    const writer = new FakeWriter();

    await executeProviderCreate(
      { commands, events, writer, custody: tokenSource() },
      command,
      calendar,
      now,
    );

    expect(writer.calls[0].invitation).toBe("all");
  });

  it("converges on one event when executed twice (idempotent write)", async () => {
    const { tenantId, principalId, calendar, command } = await seed();
    const writer = new FakeWriter();
    const deps = { commands, events, writer, custody: tokenSource() };

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
      { commands, events, writer, custody: tokenSource() },
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
      { commands, events, writer, custody: tokenSource() },
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

    const result = await executeProviderCreate(
      {
        commands,
        events,
        writer,
        custody: failingTokenSource(
          new ProviderAuthError("authorizationRevoked", "revoked"),
        ),
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
  });

  it("leaves the command pending on a transient refresh failure", async () => {
    const { calendar, command } = await seed();
    const writer = new FakeWriter();

    const result = await executeProviderCreate(
      {
        commands,
        events,
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
