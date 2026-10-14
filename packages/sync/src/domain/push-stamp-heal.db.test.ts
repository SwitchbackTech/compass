import { faker } from "@faker-js/faker";
import { seedOauthCredential } from "@sync/__tests__/helpers/credential-encryption";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { enqueuePushStampHeal } from "@sync/domain/push-stamp-heal";
import { enqueueForResources } from "@sync/domain/resource-sweep-enqueue";
import { DEFAULT_PUSH_STAMP_HEAL_COOLDOWN_MS } from "@sync/domain/subscription-maintenance.service";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { resourceJob } from "@sync/storage/contracts/job.contracts";
import { type SyncResourceRecord } from "@sync/storage/contracts/sync-resource.contracts";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { JobRepository } from "@sync/storage/repositories/job.repository";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

const objectId = () => faker.database.mongodbObjectId();
const now = () => new Date("2026-07-10T00:00:00.000Z");

describe("push-stamp heal sweep (enqueuePushStampHeal)", () => {
  const storage = setupSyncStorage(import.meta.url);
  let resources: SyncResourceRepository;
  let jobs: JobRepository;
  let credentials: CredentialRepository;

  beforeEach(() => {
    resources = new SyncResourceRepository(storage.db());
    jobs = new JobRepository(storage.db());
    credentials = new CredentialRepository(storage.db());
  });

  const deps = () => ({ resources, jobs });

  const seedGoogleEventsResource = async (input: {
    expiresAt: Date;
    pushLastReceivedAt?: Date | null;
    pushStampHealAttemptedAt?: Date | null;
    provider?: "google" | "microsoft";
  }): Promise<SyncResourceRecord> => {
    const tenantId = objectId() as SyncResourceRecord["tenantId"];
    const principalId = objectId() as SyncResourceRecord["principalId"];
    const connectionId = objectId() as SyncResourceRecord["connectionId"];
    const resource = await resources.ensure({
      tenantId,
      principalId,
      connectionId,
      resourceKind: "events",
      calendarId: objectId() as SyncResourceRecord["calendarId"],
    });
    await seedOauthCredential(credentials, {
      connectionId,
      provider: input.provider ?? "google",
      refreshToken: "refresh-token",
      scopes: [],
    });
    await resources.updateSubscription(tenantId, principalId, resource._id, {
      subscriptionId: `channel-${resource._id}`,
      subscriptionResourceId: `res-${resource._id}`,
      subscriptionToken: "token",
      subscriptionExpiresAt: input.expiresAt,
      ...(input.pushLastReceivedAt !== undefined
        ? { pushLastReceivedAt: input.pushLastReceivedAt }
        : {}),
    });
    if (input.pushStampHealAttemptedAt) {
      await resources.markPushStampHealAttempted(
        tenantId,
        principalId,
        resource._id,
        input.pushStampHealAttemptedAt,
      );
    }
    return resource;
  };

  const jobByKey = (coalescingKey: string) =>
    storage.db().collection(SYNC_COLLECTIONS.jobs).findOne({ coalescingKey });

  const healBefore = () =>
    new Date(now().getTime() - DEFAULT_PUSH_STAMP_HEAL_COOLDOWN_MS);

  it("enqueues maintain for a live Google channel missing pushLastReceivedAt", async () => {
    const unstamped = await seedGoogleEventsResource({
      expiresAt: new Date("2026-07-13T00:00:00.000Z"),
    });

    const enqueued = await enqueuePushStampHeal(deps(), healBefore(), now);

    expect(enqueued).toBe(1);
    const job = await jobByKey(`subscriptionMaintain:${unstamped._id}`);
    expect(job?.["kind"]).toBe("subscriptionMaintain");
  });

  it("skips a channel that already recorded push receipt", async () => {
    await seedGoogleEventsResource({
      expiresAt: new Date("2026-07-13T00:00:00.000Z"),
      pushLastReceivedAt: new Date("2026-07-01T00:00:00.000Z"),
    });

    const enqueued = await enqueuePushStampHeal(deps(), healBefore(), now);

    expect(enqueued).toBe(0);
  });

  it("skips a channel still inside the heal cooldown window", async () => {
    await seedGoogleEventsResource({
      expiresAt: new Date("2026-07-13T00:00:00.000Z"),
      pushStampHealAttemptedAt: new Date("2026-07-09T23:00:00.000Z"),
    });

    const enqueued = await enqueuePushStampHeal(deps(), healBefore(), now);

    expect(enqueued).toBe(0);
  });

  it("still enqueues near-expiry channels for the ordinary subscription sweep", async () => {
    const expiring = await seedGoogleEventsResource({
      expiresAt: new Date("2026-07-10T01:00:00.000Z"),
      pushLastReceivedAt: new Date("2026-07-01T00:00:00.000Z"),
    });

    const renewBefore = new Date("2026-07-10T12:00:00.000Z");
    const { resources, jobs } = deps();
    const enqueued = await enqueueForResources(
      { resources, jobs },
      (b, l) => resources.listExpiringSubscriptions(b, l),
      (r, n) => resourceJob(r, "subscriptionMaintain", n()),
      renewBefore,
      now,
    );

    expect(enqueued).toBe(1);
    expect(
      await jobByKey(`subscriptionMaintain:${expiring._id}`),
    ).not.toBeNull();
  });

  it("bounds the heal sweep", async () => {
    await seedGoogleEventsResource({
      expiresAt: new Date("2026-07-13T00:00:00.000Z"),
    });
    await seedGoogleEventsResource({
      expiresAt: new Date("2026-07-14T00:00:00.000Z"),
    });

    const enqueued = await enqueuePushStampHeal(deps(), healBefore(), now, 1);

    expect(enqueued).toBe(1);
    expect(
      await storage.db().collection(SYNC_COLLECTIONS.jobs).countDocuments({}),
    ).toBe(1);
  });

  it("does not enqueue unstamped Microsoft channels", async () => {
    await seedGoogleEventsResource({
      expiresAt: new Date("2026-07-13T00:00:00.000Z"),
      provider: "microsoft",
    });

    const enqueued = await enqueuePushStampHeal(deps(), healBefore(), now);

    expect(enqueued).toBe(0);
  });

  it("skips an expired channel", async () => {
    await seedGoogleEventsResource({
      expiresAt: new Date("2026-07-09T00:00:00.000Z"),
    });

    const enqueued = await enqueuePushStampHeal(deps(), healBefore(), now);

    expect(enqueued).toBe(0);
  });
});
