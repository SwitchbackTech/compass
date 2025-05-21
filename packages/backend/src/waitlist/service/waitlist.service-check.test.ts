import {
  cleanupCollections,
  cleanupTestMongo,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import WaitlistService from "./waitlist.service";
import { answer } from "./waitlist.service.test-setup";

describe("isOnWaitlist", () => {
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
