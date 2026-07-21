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
import {
  type ProviderCreateInput,
  type ProviderEventWriter,
  type ProviderWriteResult,
} from "@sync/providers/provider-event-writer.port";
import { type CommandSubmit } from "@sync/storage/contracts/command.contracts";
import { CommandRepository } from "@sync/storage/repositories/command.repository";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { SyncMongoService } from "@sync/storage/sync-mongo.service";

const uri = process.env["SYNC_MONGO_URI"] as string;
const objectId = () => faker.database.mongodbObjectId();

class FakeWriter implements ProviderEventWriter {
  readonly provider = "google" as const;
  calls: ProviderCreateInput[] = [];
  async createEvent(input: ProviderCreateInput): Promise<ProviderWriteResult> {
    this.calls.push(input);
    return { providerEventId: "g-evt-1", providerVersion: "etag-1" };
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

const provider = (writer: ProviderEventWriter) => ({
  writer,
  custody: { getValidAccessToken: async () => "access-token" },
});

describe("submitCloudCommand provider dispatch", () => {
  let mongo: SyncMongoService;
  let commands: CommandRepository;
  let events: EventRepository;
  let calendars: ProviderCalendarRepository;

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
    calendars = new ProviderCalendarRepository(mongo.db);
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
      { commands, events, calendars, execution: "active" },
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
});
