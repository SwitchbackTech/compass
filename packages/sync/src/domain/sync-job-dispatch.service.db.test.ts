import { faker } from "@faker-js/faker";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import {
  dispatchSyncJob,
  type SyncJobDispatchDeps,
} from "@sync/domain/sync-job-dispatch.service";
import {
  type ProviderEvent,
  type ProviderEventRead,
} from "@sync/providers/provider-event.port";
import {
  type ProviderEventPage,
  ProviderEventReadError,
  type ProviderEventReader,
  type ProviderEventReadInput,
} from "@sync/providers/provider-event-reader.port";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { type JobRecord } from "@sync/storage/contracts/job.contracts";
import { type ProviderCalendarRecord } from "@sync/storage/contracts/provider-calendar.contracts";
import { type ProviderConnectionRecord } from "@sync/storage/contracts/provider-connection.contracts";
import { type SyncResourceRecord } from "@sync/storage/contracts/sync-resource.contracts";
import { CommandRepository } from "@sync/storage/repositories/command.repository";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { InvalidationRepository } from "@sync/storage/repositories/invalidation.repository";
import { JobRepository } from "@sync/storage/repositories/job.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

const objectId = () => faker.database.mongodbObjectId();
const now = () => new Date("2026-07-10T00:00:00.000Z");

const schedule = {
  kind: "timed" as const,
  start: "2026-07-14T09:00:00-06:00",
  end: "2026-07-14T10:00:00-06:00",
  timeZone: "America/Denver",
};
const single = (id: string): ProviderEvent => ({
  kind: "event",
  providerEventId: id,
  providerVersion: `etag-${id}`,
  providerUpdatedAt: null,
  content: {
    title: id,
    description: "",
    location: null,
    organizer: null,
    attendees: [],
    conference: null,
  },
  schedule,
  busy: true,
  recurrence: { kind: "single" },
});
const page = (
  events: ProviderEventRead[],
  nextSyncToken: string | null = null,
): ProviderEventPage => ({
  events,
  skipped: 0,
  nextPageToken: null,
  nextSyncToken,
});

// A reader that replays scripted pages, or throws a scripted error (e.g. an
// expired cursor) on the next read.
class FakeReader implements ProviderEventReader {
  readonly provider = "google" as const;
  #pages: ProviderEventPage[];
  #error: ProviderEventReadError | null;

  constructor(
    pages: ProviderEventPage[],
    error: ProviderEventReadError | null = null,
  ) {
    this.#pages = [...pages];
    this.#error = error;
  }
  async listEventPage(
    _input: ProviderEventReadInput,
  ): Promise<ProviderEventPage> {
    if (this.#error) throw this.#error;
    const next = this.#pages.shift();
    if (!next) throw new Error("FakeReader: no page scripted");
    return next;
  }
}

const tokenSource = { getValidAccessToken: async () => "access-token" };

// A notification adapter that records watch calls and returns a fixed channel,
// so a subscriptionMaintain dispatch runs without a network round-trip.
const notifications = {
  provider: "google" as const,
  watched: [] as string[],
  watchEvents: async (input: { channelId: string }) => {
    notifications.watched.push(input.channelId);
    return {
      channelId: input.channelId,
      resourceId: "provider-resource",
      expiresAt: new Date("2026-07-17T00:00:00.000Z"),
    };
  },
  stopChannel: async () => {},
  parseCallback: () => null,
};

// A calendar-discovery adapter that returns one active calendar, so a
// calendarListSync dispatch runs without a network round-trip.
const discovery = {
  provider: "google" as const,
  discoverCalendars: async () => ({
    calendars: [
      {
        providerCalendarId: "primary@google.com",
        displayName: "Google",
        color: null,
        primary: true,
        active: true,
        accessRole: "owner" as const,
        capabilities: {
          canReadEvents: true,
          canWriteEvents: true,
          canReadBusy: true,
          canInviteAttendees: true,
        },
      },
    ],
    cursor: "cursor-1",
  }),
};

describe("dispatchSyncJob", () => {
  const storage = setupSyncStorage(import.meta.url);
  let events: EventRepository;
  let occurrences: EventOccurrenceRepository;
  let resources: SyncResourceRepository;
  let calendars: ProviderCalendarRepository;
  let commands: CommandRepository;
  let jobs: JobRepository;
  let invalidations: InvalidationRepository;
  // Dispatch resolves the connection for a calendarListSync job; a test sets what
  // findById returns without seeding a full connection record.
  let stubbedConnection: ProviderConnectionRecord | null;

  beforeEach(() => {
    events = new EventRepository(storage.db());
    occurrences = new EventOccurrenceRepository(storage.db(), storage.client());
    resources = new SyncResourceRepository(storage.db());
    calendars = new ProviderCalendarRepository(storage.db());
    commands = new CommandRepository(storage.db());
    jobs = new JobRepository(storage.db());
    invalidations = new InvalidationRepository(storage.db());
    stubbedConnection = null;
  });

  const connections = {
    findById: async () => stubbedConnection,
  } as unknown as SyncJobDispatchDeps["connections"];

  const deps = (reader: FakeReader): SyncJobDispatchDeps => ({
    events,
    occurrences,
    resources,
    calendars,
    connections,
    discovery,
    jobs,
    commands,
    reader,
    custody: tokenSource,
    notifications,
    callbackUrl: "https://sync.example/sync/notifications/google",
    invalidations,
  });

  const seedCalendar = (): Promise<ProviderCalendarRecord> =>
    calendars.upsertByProviderCalendar({
      tenantId: objectId() as ProviderCalendarRecord["tenantId"],
      principalId: objectId() as ProviderCalendarRecord["principalId"],
      connectionId: objectId() as ProviderCalendarRecord["connectionId"],
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

  // Ensure the calendar's events resource, optionally already imported (holding
  // a cursor), as a prior import/pull would have left it.
  const seedResource = async (
    calendar: ProviderCalendarRecord,
    cursor: string | null,
  ): Promise<SyncResourceRecord> => {
    const resource = await resources.ensure({
      tenantId: calendar.tenantId,
      principalId: calendar.principalId,
      connectionId: calendar.connectionId,
      resourceKind: "events",
      calendarId: calendar._id,
    });
    if (cursor) {
      await resources.advanceCursor(
        calendar.tenantId,
        calendar.principalId,
        resource._id,
        cursor,
        now(),
      );
    }
    return resource;
  };

  const jobFor = (
    resource: SyncResourceRecord,
    kind: JobRecord["kind"],
  ): JobRecord =>
    ({
      _id: objectId(),
      tenantId: resource.tenantId,
      principalId: resource.principalId,
      connectionId: resource.connectionId,
      resourceId: resource._id,
      commandId: null,
      kind,
      priority: 0,
      state: "claimed",
      runAfter: now(),
      attempt: 0,
      coalescingKey: `${kind}:${resource._id}`,
      leaseOwner: "worker-1",
      leaseExpiresAt: now(),
      failureClass: null,
      createdAt: now(),
      updatedAt: now(),
    }) as JobRecord;

  it("settles an applied incremental pull as done with no followup", async () => {
    const calendar = await seedCalendar();
    const resource = await seedResource(calendar, "cursor-0");
    const reader = new FakeReader([page([single("new-1")], "cursor-1")]);

    const outcome = await dispatchSyncJob(
      deps(reader),
      jobFor(resource, "incrementalPull"),
      now,
    );
    expect(outcome).toEqual({ result: "done" });

    const feed = await storage
      .db()
      .collection(SYNC_COLLECTIONS.invalidations)
      .find({ principalId: calendar.principalId })
      .toArray();
    expect(feed).toHaveLength(1);
    expect(feed[0]?.invalidation).toEqual({
      kind: "calendar",
      connectionId: calendar.connectionId,
      calendarId: calendar._id,
    });
  });

  it("hands off an expired-cursor pull to a repair followup", async () => {
    const calendar = await seedCalendar();
    const resource = await seedResource(calendar, "stale-cursor");
    const reader = new FakeReader(
      [],
      new ProviderEventReadError("cursorExpired", "gone"),
    );

    const outcome = await dispatchSyncJob(
      deps(reader),
      jobFor(resource, "incrementalPull"),
      now,
    );
    if (outcome.result !== "done" || !outcome.followup) {
      throw new Error("expected a followup");
    }
    expect(outcome.followup.kind).toBe("repair");
    expect(outcome.followup.coalescingKey).toBe(`repair:${resource._id}`);
    expect(outcome.followup.resourceId).toBe(resource._id);
  });

  it("hands off a pull on a never-imported resource to an initial import", async () => {
    const calendar = await seedCalendar();
    const resource = await seedResource(calendar, null); // no cursor
    const reader = new FakeReader([]); // pull returns notImported before reading

    const outcome = await dispatchSyncJob(
      deps(reader),
      jobFor(resource, "incrementalPull"),
      now,
    );
    if (outcome.result !== "done" || !outcome.followup) {
      throw new Error("expected a followup");
    }
    expect(outcome.followup.kind).toBe("initialImport");
  });

  it("settles a completed repair as done", async () => {
    const calendar = await seedCalendar();
    const resource = await seedResource(calendar, null);
    const reader = new FakeReader([page([single("keep")], "cursor-1")]);

    const outcome = await dispatchSyncJob(
      deps(reader),
      jobFor(resource, "repair"),
      now,
    );
    expect(outcome).toEqual({ result: "done" });
  });

  it("retries a repair that did not complete", async () => {
    const calendar = await seedCalendar();
    const resource = await seedResource(calendar, null);
    // A page with no nextSyncToken leaves the repair unable to trust the rebuild.
    const reader = new FakeReader([page([single("keep")], null)]);

    const outcome = await dispatchSyncJob(
      deps(reader),
      jobFor(resource, "repair"),
      now,
    );
    expect(outcome).toEqual({
      result: "retry",
      failureClass: "retryableTransient",
      reason: "repair did not complete",
    });
  });

  it("runs an initial import and hands off to a subscription bootstrap", async () => {
    const calendar = await seedCalendar();
    const resource = await seedResource(calendar, "cursor-0"); // already imported
    const reader = new FakeReader([]); // import no-ops on an existing cursor

    const outcome = await dispatchSyncJob(
      deps(reader),
      jobFor(resource, "initialImport"),
      now,
    );
    // Even an idempotent no-op import ensures the push channel gets opened.
    if (outcome.result !== "done" || !outcome.followup) {
      throw new Error("expected a followup");
    }
    expect(outcome.followup.kind).toBe("subscriptionMaintain");
    expect(outcome.followup.coalescingKey).toBe(
      `subscriptionMaintain:${resource._id}`,
    );
  });

  it("drops a job whose resource no longer exists", async () => {
    const calendar = await seedCalendar();
    const resource = await seedResource(calendar, "cursor-0");
    const ghost = { ...resource, _id: objectId() };
    const reader = new FakeReader([]);

    const outcome = await dispatchSyncJob(
      deps(reader),
      jobFor(ghost, "incrementalPull"),
      now,
    );
    expect(outcome).toEqual({
      result: "drop",
      reason: "resource no longer exists",
    });
  });

  it("does not own a non-sync job kind", async () => {
    const calendar = await seedCalendar();
    const resource = await seedResource(calendar, "cursor-0");
    const reader = new FakeReader([]);

    const outcome = await dispatchSyncJob(
      deps(reader),
      jobFor(resource, "reconcile"),
      now,
    );
    expect(outcome).toEqual({ result: "unsupported", kind: "reconcile" });
  });

  it("settles a subscriptionMaintain job as done, opening a channel", async () => {
    const calendar = await seedCalendar();
    const resource = await seedResource(calendar, "cursor-0"); // no subscription
    notifications.watched = [];
    const reader = new FakeReader([]);

    const outcome = await dispatchSyncJob(
      deps(reader),
      jobFor(resource, "subscriptionMaintain"),
      now,
    );

    expect(outcome).toEqual({ result: "done" });
    // The channel was actually opened and persisted for the resource.
    expect(notifications.watched).toHaveLength(1);
    const saved = await resources.findById(
      resource.tenantId,
      resource.principalId,
      resource._id,
    );
    expect(saved?.subscriptionResourceId).toBe("provider-resource");
  });

  const calendarListJob = (
    connectionId: string,
    tenantId: string,
    principalId: string,
  ): JobRecord =>
    ({
      _id: objectId(),
      tenantId,
      principalId,
      connectionId,
      resourceId: null,
      commandId: null,
      kind: "calendarListSync",
      priority: 0,
      state: "claimed",
      runAfter: now(),
      attempt: 0,
      coalescingKey: `calendarListSync:${connectionId}`,
      leaseOwner: "worker-1",
      leaseExpiresAt: now(),
      failureClass: null,
      createdAt: now(),
      updatedAt: now(),
    }) as JobRecord;

  it("routes calendarListSync to discovery and settles done", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const connectionId = objectId();
    stubbedConnection = {
      _id: connectionId,
      tenantId,
      principalId,
    } as ProviderConnectionRecord;

    const outcome = await dispatchSyncJob(
      deps(new FakeReader([])),
      calendarListJob(connectionId, tenantId, principalId),
      now,
    );

    expect(outcome).toEqual({ result: "done" });
    // Discovery persisted the calendar and enqueued its initial import.
    const persisted = await calendars.listByConnection(
      tenantId as ProviderCalendarRecord["tenantId"],
      principalId as ProviderCalendarRecord["principalId"],
      connectionId as ProviderCalendarRecord["connectionId"],
    );
    expect(persisted).toHaveLength(1);
    const importCount = await storage
      .db()
      .collection(SYNC_COLLECTIONS.jobs)
      .countDocuments({ kind: "initialImport" });
    expect(importCount).toBe(1);
  });

  it("drops a calendarListSync whose connection no longer exists", async () => {
    stubbedConnection = null; // findById returns nothing

    const outcome = await dispatchSyncJob(
      deps(new FakeReader([])),
      calendarListJob(objectId(), objectId(), objectId()),
      now,
    );

    expect(outcome).toEqual({
      result: "drop",
      reason: "connection no longer exists",
    });
  });
});
