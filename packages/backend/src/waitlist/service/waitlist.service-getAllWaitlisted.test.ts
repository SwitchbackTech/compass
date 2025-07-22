import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import WaitlistService from "@backend/waitlist/service/waitlist.service";
import { answer } from "@backend/waitlist/service/waitlist.service.test-setup";

describe("getAllWaitlisted", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should return all waitlisted records", async () => {
    await WaitlistService.addToWaitlist(answer.email, answer);

    const records = await WaitlistService.getAllWaitlisted();

    expect(records.length).toBeGreaterThanOrEqual(1);
    const allWaitlisted = records.every((r) => r.status === "waitlisted");
    expect(allWaitlisted).toBe(true);
  });
});
