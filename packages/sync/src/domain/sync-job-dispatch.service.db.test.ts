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
import { type JobRecord } from "@sync/storage/contracts/job.contracts";
import { type ProviderCalendarRecord } from "@sync/storage/contracts/provider-calendar.contracts";
import { type SyncResourceRecord } from "@sync/storage/contracts/sync-resource.contracts";
import { CommandRepository } from "@sync/storage/repositories/command.repository";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
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

describe("dispatchSyncJob", () => {
  const storage = setupSyncStorage(import.meta.url);
  let events: EventRepository;
  let occurrences: EventOccurrenceRepository;
  let resources: SyncResourceRepository;
  let calendars: ProviderCalendarRepository;
  let commands: CommandRepository;

  beforeEach(() => {
    events = new EventRepository(storage.db());
    occurrences = new EventOccurrenceRepository(storage.db(), storage.client());
    resources = new SyncResourceRepository(storage.db());
    calendars = new ProviderCalendarRepository(storage.db());
    commands = new CommandRepository(storage.db());
  });

  const deps = (reader: FakeReader): SyncJobDispatchDeps => ({
    events,
    occurrences,
    resources,
    calendars,
    commands,
    reader,
    custody: tokenSource,
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

  it("runs an initial import for an already-imported resource as an idempotent no-op", async () => {
    const calendar = await seedCalendar();
    const resource = await seedResource(calendar, "cursor-0"); // already imported
    const reader = new FakeReader([]); // import no-ops on an existing cursor

    const outcome = await dispatchSyncJob(
      deps(reader),
      jobFor(resource, "initialImport"),
      now,
    );
    expect(outcome).toEqual({ result: "done" });
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
});
