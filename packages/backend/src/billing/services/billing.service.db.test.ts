import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import billingService from "@backend/billing/services/billing.service";
import mongoService from "@backend/common/services/mongo.service";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";

describe("BillingService (db)", () => {
  beforeAll(async () => {
    await setupTestDb(import.meta.url);
  });
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  it("starts a trial with field-level $set and preserves Stripe ids", async () => {
    const userId = mongoService.objectId();
    await mongoService.user.insertOne({
      _id: userId,
      email: "trial@example.com",
      name: "Trial User",
      firstName: "Trial",
      lastName: "User",
      locale: "en",
      billing: {
        subscriptionStatus: "awaiting_checkout",
        stripeCustomerId: "cus_keep",
      },
    });

    const status = await billingService.startTrial(userId.toString());

    expect(status.subscriptionStatus).toBe("trialing");
    expect(status.isReadOnly).toBe(false);

    const stored = await mongoService.user.findOne({ _id: userId });
    expect(stored?.billing?.stripeCustomerId).toBe("cus_keep");
    expect(stored?.billing?.subscriptionStatus).toBe("trialing");
  });

  it("is idempotent: a second startTrial does not extend the window", async () => {
    const userId = mongoService.objectId();
    await mongoService.user.insertOne({
      _id: userId,
      email: "once@example.com",
      name: "Once",
      firstName: "Once",
      lastName: "User",
      locale: "en",
    });

    const first = await billingService.startTrial(userId.toString());
    const stored = await mongoService.user.findOne({ _id: userId });
    const second = await billingService.startTrial(userId.toString());

    expect(second.trialEndsAt).toBe(first.trialEndsAt);
    expect(stored?.billing?.trialStartedAt?.toISOString()).toBe(
      (
        await mongoService.user.findOne({ _id: userId })
      )?.billing?.trialStartedAt?.toISOString(),
    );
  });

  it("throws when the user does not exist", async () => {
    await expect(
      billingService.getStatus(mongoService.objectId().toString()),
    ).rejects.toThrow("User not found");
  });
});
