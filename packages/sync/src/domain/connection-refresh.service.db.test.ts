import { seedProviderCalendar } from "@sync/__tests__/helpers/fixtures";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { refreshPrincipalCalendars } from "@sync/domain/connection-refresh.service";
import { type ProviderCalendarRecord } from "@sync/storage/contracts/provider-calendar.contracts";
import { JobRepository } from "@sync/storage/repositories/job.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

const now = () => new Date("2026-08-10T12:00:00.000Z");

describe("refreshPrincipalCalendars (db)", () => {
  const storage = setupSyncStorage(import.meta.url);

  const deps = () => {
    const db = storage.db();
    return {
      resources: new SyncResourceRepository(db),
      jobs: new JobRepository(db),
      calendars: new ProviderCalendarRepository(db),
    };
  };

  it("revives a wedged failed repair job for the connection, not just incrementalPull", async () => {
    const { resources, jobs, calendars } = deps();
    const calendar: ProviderCalendarRecord =
      await seedProviderCalendar(calendars);
    const resource = await resources.ensure({
      tenantId: calendar.tenantId,
      principalId: calendar.principalId,
      connectionId: calendar.connectionId,
      resourceKind: "events",
      calendarId: calendar._id,
    });

    // Seed a failed repair job the same way a real worker would leave one:
    // enqueue, claim, then exhaust it.
    const repairEnqueue = {
      tenantId: resource.tenantId,
      principalId: resource.principalId,
      connectionId: resource.connectionId,
      resourceId: resource._id,
      commandId: null,
      kind: "repair" as const,
      priority: 0,
      runAfter: now(),
      coalescingKey: `repair:${resource._id}`,
    };
    const repairJob = await jobs.enqueue(repairEnqueue);
    const claimed = await jobs.claimDueJob("worker-1", now(), 60_000);
    if (!claimed) throw new Error("expected to claim the seeded repair job");
    await jobs.fail(claimed._id, "worker-1");

    const tally = await refreshPrincipalCalendars(
      { resources, jobs },
      resource.tenantId,
      resource.principalId,
      now,
    );

    expect(tally.requeuedFailed).toBeGreaterThanOrEqual(1);
    const revived = await jobs.findById(
      resource.tenantId,
      resource.principalId,
      repairJob._id,
    );
    expect(revived?.state).toBe("pending");
    expect(revived?.attempt).toBe(0);
  });
});
