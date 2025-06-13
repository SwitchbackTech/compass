import {
  cleanupCollections,
  cleanupTestMongo,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import WaitlistService from "./waitlist.service";
import { answer } from "./waitlist.service.test-setup";

describe("getAllWaitlisted", () => {
  let setup: Awaited<ReturnType<typeof setupTestDb>>;

  beforeAll(async () => {
    setup = await setupTestDb();
  });

  beforeEach(async () => {
    await cleanupCollections(setup.db);
  });

  afterAll(async () => {
    await cleanupTestMongo(setup);
  });

  it("should return all waitlisted records", async () => {
    await WaitlistService.addToWaitlist(answer.email, answer);

    const records = await WaitlistService.getAllWaitlisted();

    expect(records.length).toBeGreaterThanOrEqual(1);
    const allWaitlisted = records.every((r) => r.status === "waitlisted");
    expect(allWaitlisted).toBe(true);
  });
});
