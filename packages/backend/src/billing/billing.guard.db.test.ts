import { type Schema_UserBilling } from "@core/types/user.types";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { mockEnv } from "@backend/__tests__/helpers/mock.setup";
import { assertBillingAllowsWrites } from "@backend/billing/billing.guard";
import mongoService from "@backend/common/services/mongo.service";
import { EventMutationException } from "@backend/event/event.error";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";

const stripeConfigured = {
  STRIPE_SECRET_KEY: "rk_test_123",
  STRIPE_WEBHOOK_SECRET: "whsec_test",
  STRIPE_PRICE_ID: "price_test",
};

const insertUser = async (billing?: Schema_UserBilling) => {
  const userId = mongoService.objectId();
  await mongoService.user.insertOne({
    _id: userId,
    email: `${userId.toString()}@example.com`,
    name: "Guard User",
    firstName: "Guard",
    lastName: "User",
    locale: "en",
    ...(billing ? { billing } : {}),
  });
  return userId.toString();
};

describe("assertBillingAllowsWrites", () => {
  beforeAll(async () => {
    await setupTestDb(import.meta.url);
  });
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  it("no-ops when Stripe is unconfigured", async () => {
    const userId = await insertUser({
      subscriptionStatus: "awaiting_checkout",
    });
    await expect(assertBillingAllowsWrites(userId)).resolves.toBeUndefined();
  });

  it("allows active and past_due writes when Stripe is configured", async () => {
    using _env = mockEnv(stripeConfigured);
    const active = await insertUser({
      subscriptionStatus: "active",
      stripeSubscriptionId: "sub_a",
    });
    const pastDue = await insertUser({
      subscriptionStatus: "past_due",
      stripeSubscriptionId: "sub_p",
    });
    await expect(assertBillingAllowsWrites(active)).resolves.toBeUndefined();
    await expect(assertBillingAllowsWrites(pastDue)).resolves.toBeUndefined();
  });

  it("rejects awaiting_checkout and expired with BILLING_REQUIRED", async () => {
    using _env = mockEnv(stripeConfigured);
    const awaiting = await insertUser({
      subscriptionStatus: "awaiting_checkout",
    });
    const expired = await insertUser({ subscriptionStatus: "expired" });

    await expect(assertBillingAllowsWrites(awaiting)).rejects.toBeInstanceOf(
      EventMutationException,
    );
    await expect(assertBillingAllowsWrites(expired)).rejects.toMatchObject({
      mutationCode: "BILLING_REQUIRED",
    });
  });

  it("rejects missing billing and local trialing without a Stripe subscription", async () => {
    using _env = mockEnv(stripeConfigured);
    const missing = await insertUser();
    const localTrial = await insertUser({
      subscriptionStatus: "trialing",
      trialEndsAt: new Date("2099-01-01T00:00:00.000Z"),
    });

    await expect(assertBillingAllowsWrites(missing)).rejects.toMatchObject({
      mutationCode: "BILLING_REQUIRED",
    });
    await expect(assertBillingAllowsWrites(localTrial)).rejects.toMatchObject({
      mutationCode: "BILLING_REQUIRED",
    });
  });
});
