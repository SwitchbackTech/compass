import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import WaitlistService from "@backend/waitlist/service/waitlist.service";
import { answer } from "@backend/waitlist/service/waitlist.service.test-setup";

describe("isOnWaitlist", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should return false if email is not waitlisted", async () => {
    const result = await WaitlistService.isOnWaitlist(answer.email);
    expect(result).toBe(false);
  });

  it("should return true if email is waitlisted", async () => {
    await WaitlistService.addToWaitlist(answer.email, answer);

    const result = await WaitlistService.isOnWaitlist(answer.email);

    expect(result).toBe(true);
  });
});
