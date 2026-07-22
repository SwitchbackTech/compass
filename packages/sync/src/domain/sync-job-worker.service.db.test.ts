import { faker } from "@faker-js/faker";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import {
  SyncJobWorker,
  type SyncJobWorkerDeps,
} from "@sync/domain/sync-job-worker.service";
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
import { type SyncResourceRecord } from "@sync/storage/contracts/sync-resource.contracts";
import { CommandRepository } from "@sync/storage/repositories/command.repository";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { JobRepository } from "@sync/storage/repositories/job.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

const objectId = () => faker.database.mongodbObjectId();
const now = () => new Date("2026-07-10T00:00:00.000Z");
const OWNER = "worker-under-test";

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
const pageOf = (
  events: ProviderEventRead[],
  nextSyncToken: string | null = null,
): ProviderEventPage => ({
  events,
  skipped: 0,
  nextPageToken: null,
  nextSyncToken,
});

// Replays scripted pages, or throws a scripted error on the next read.
class FakeReader implements ProviderEventReader {
  readonly provider = "google" as const;
  #pages: ProviderEventPage[];
  #error: Error | null;

  constructor(pages: ProviderEventPage[], error: Error | null = null) {
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

describe("SyncJobWorker", () => {
  const storage = setupSyncStorage(import.meta.url);
  let events: EventRepository;
  let occurrences: EventOccurrenceRepository;
  let resources: SyncResourceRepository;
  let calendars: ProviderCalendarRepository;
  let commands: CommandRepository;
  let jobs: JobRepository;

  beforeEach(() => {
    events = new EventRepository(storage.db());
    occurrences = new EventOccurrenceRepository(storage.db(), storage.client());
    resources = new SyncResourceRepository(storage.db());
    calendars = new ProviderCalendarRepository(storage.db());
    commands = new CommandRepository(storage.db());
    jobs = new JobRepository(storage.db());
  });

  const deps = (reader: FakeReader): SyncJobWorkerDeps => ({
    events,
    occurrences,
    resources,
    calendars,
    commands,
    jobs,
    reader,
    custody: tokenSource,
  });

  const worker = (reader: FakeReader) =>
    new SyncJobWorker(deps(reader), OWNER, { now });

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

  const enqueue = (
    resource: Pick<
      SyncResourceRecord,
      "tenantId" | "principalId" | "connectionId" | "_id"
    >,
    kind: JobRecord["kind"],
  ) =>
    jobs.enqueue({
      tenantId: resource.tenantId,
      principalId: resource.principalId,
      connectionId: resource.connectionId,
      resourceId: resource._id,
      commandId: null,
      kind,
      priority: 0,
      runAfter: now(),
      coalescingKey: `${kind}:${resource._id}`,
    });

  const jobByKey = (coalescingKey: string) =>
    storage.db().collection(SYNC_COLLECTIONS.jobs).findOne({ coalescingKey });

  it("is idle when no job is due", async () => {
    const outcome = await worker(new FakeReader([])).runOnce();
    expect(outcome).toBe("idle");
  });

  it("completes an applied incremental pull, removing the job", async () => {
    const calendar = await seedCalendar();
    const resource = await seedResource(calendar, "cursor-0");
    const job = await enqueue(resource, "incrementalPull");

    const result = await worker(
      new FakeReader([pageOf([single("new-1")], "cursor-1")]),
    ).runOnce();

    expect(result).toBe("processed");
    expect(
      await jobs.findById(resource.tenantId, resource.principalId, job._id),
    ).toBeNull();
  });

  it("hands an expired-cursor pull off by enqueuing a repair and completing the pull", async () => {
    const calendar = await seedCalendar();
    const resource = await seedResource(calendar, "stale");
    const pull = await enqueue(resource, "incrementalPull");

    await worker(
      new FakeReader([], new ProviderEventReadError("cursorExpired", "gone")),
    ).runOnce();

    // The pull job is gone; a coalesced repair job now waits.
    expect(
      await jobs.findById(resource.tenantId, resource.principalId, pull._id),
    ).toBeNull();
    const repair = await jobByKey(`repair:${resource._id}`);
    expect(repair?.kind).toBe("repair");
    expect(repair?.state).toBe("pending");
  });

  it("reschedules a repair that did not complete instead of deleting it", async () => {
    const calendar = await seedCalendar();
    const resource = await seedResource(calendar, null);
    const job = await enqueue(resource, "repair");

    // A page with no nextSyncToken makes the repair report incomplete.
    await worker(new FakeReader([pageOf([single("keep")], null)])).runOnce();

    const after = await jobs.findById(
      resource.tenantId,
      resource.principalId,
      job._id,
    );
    expect(after?.state).toBe("pending");
    expect(after?.leaseOwner).toBeNull();
    // Backed off to a future runAfter, and its failure class recorded.
    expect(after!.runAfter.getTime()).toBeGreaterThan(now().getTime());
    expect(after?.failureClass).toBe("retryableTransient");
  });

  it("reschedules a job whose engine throws a transient error", async () => {
    const calendar = await seedCalendar();
    const resource = await seedResource(calendar, "cursor-0");
    const job = await enqueue(resource, "incrementalPull");

    // A non-cursorExpired read error propagates out of dispatch.
    await worker(
      new FakeReader([], new ProviderEventReadError("transient", "flaky")),
    ).runOnce();

    const after = await jobs.findById(
      resource.tenantId,
      resource.principalId,
      job._id,
    );
    expect(after?.state).toBe("pending");
    expect(after!.runAfter.getTime()).toBeGreaterThan(now().getTime());
  });

  it("drops a job whose resource no longer exists", async () => {
    const calendar = await seedCalendar();
    const resource = await seedResource(calendar, "cursor-0");
    // Enqueue against the resource, then remove the resource so dispatch drops.
    const job = await enqueue(resource, "incrementalPull");
    await storage
      .db()
      .collection(SYNC_COLLECTIONS.syncResources)
      .deleteOne({ _id: resource._id });

    await worker(new FakeReader([])).runOnce();

    expect(
      await jobs.findById(resource.tenantId, resource.principalId, job._id),
    ).toBeNull();
  });

  it("drains every due job and then reports how many it processed", async () => {
    const calendarA = await seedCalendar();
    const calendarB = await seedCalendar();
    const resourceA = await seedResource(calendarA, "cursor-a");
    const resourceB = await seedResource(calendarB, "cursor-b");
    await enqueue(resourceA, "incrementalPull");
    await enqueue(resourceB, "incrementalPull");

    const processed = await worker(
      new FakeReader([
        pageOf([single("a")], "cursor-a1"),
        pageOf([single("b")], "cursor-b1"),
      ]),
    ).drain();

    expect(processed).toBe(2);
    expect(
      await storage
        .db()
        .collection(SYNC_COLLECTIONS.jobs)
        .countDocuments({ state: "pending", runAfter: { $lte: now() } }),
    ).toBe(0);
  });
});
