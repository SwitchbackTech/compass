import { faker } from "@faker-js/faker";
import { type Db, MongoClient } from "mongodb";
import { installIndexManifest } from "@sync/storage/index-manifest";
import { type JobEnqueue } from "@sync/storage/job.record";
import { JobRepository } from "@sync/storage/job.repository";

const uri = process.env["SYNC_MONGO_URI"] as string;
const objectId = () => faker.database.mongodbObjectId();

const enqueue = (overrides: Partial<JobEnqueue> = {}): JobEnqueue =>
  ({
    tenantId: objectId(),
    principalId: objectId(),
    connectionId: objectId(),
    resourceId: null,
    commandId: null,
    kind: "incrementalPull",
    priority: 2,
    runAfter: new Date("2026-07-20T12:00:00.000Z"),
    coalescingKey: `pull:${objectId()}`,
    ...overrides,
  }) as JobEnqueue;

describe("JobRepository", () => {
  let client: MongoClient;
  let db: Db;
  let repo: JobRepository;

  beforeEach(async () => {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(`job_${objectId()}`);
    await installIndexManifest(db);
    repo = new JobRepository(db);
  });

  afterEach(async () => {
    await db.dropDatabase();
    await client.close();
  });

  it("enqueues a new pending job", async () => {
    const job = await repo.enqueue(enqueue());
    expect(job.state).toBe("pending");
    expect(job.attempt).toBe(0);
    expect(job.leaseOwner).toBeNull();
  });

  it("coalesces repeated enqueues of the same key into one job", async () => {
    const coalescingKey = "pull:resource-1";
    const first = await repo.enqueue(enqueue({ coalescingKey, priority: 2 }));
    const second = await repo.enqueue(enqueue({ coalescingKey, priority: 9 }));

    expect(second._id).toBe(first._id);
    // The existing job is returned unchanged — a storm does not bump priority.
    expect(second.priority).toBe(2);
    expect(await db.collection("jobs").countDocuments()).toBe(1);
  });

  it("allows a fresh job under the same key after the previous one is removed", async () => {
    const coalescingKey = "pull:resource-2";
    const first = await repo.enqueue(enqueue({ coalescingKey }));
    expect(await repo.remove(first._id, coalescingKey)).toBe(true);

    const second = await repo.enqueue(enqueue({ coalescingKey }));
    expect(second._id).not.toBe(first._id);
    expect(await db.collection("jobs").countDocuments()).toBe(1);
  });

  it("does not remove a different job that reused the key", async () => {
    const coalescingKey = "pull:resource-3";
    const first = await repo.enqueue(enqueue({ coalescingKey }));
    // Simulate: our job completes, a new one is enqueued under the same key.
    await repo.remove(first._id, coalescingKey);
    const second = await repo.enqueue(enqueue({ coalescingKey }));

    // A late remove of the ORIGINAL id must not delete the new job.
    expect(await repo.remove(first._id, coalescingKey)).toBe(false);
    expect(
      await repo.findById(second.tenantId, second.principalId, second._id),
    ).not.toBeNull();
  });

  it("scopes findById to the owning principal", async () => {
    const job = await repo.enqueue(enqueue());
    expect(
      await repo.findById(
        job.tenantId,
        objectId() as JobEnqueue["principalId"],
        job._id,
      ),
    ).toBeNull();
  });

  it("rejects a raw duplicate insert violating the coalescing index", async () => {
    const collection = db.collection("jobs");
    await collection.insertOne({
      _id: objectId(),
      coalescingKey: "k",
    } as never);
    await expect(
      collection.insertOne({ _id: objectId(), coalescingKey: "k" } as never),
    ).rejects.toThrow();
  });
});
