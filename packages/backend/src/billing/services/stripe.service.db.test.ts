import type Stripe from "stripe";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { mockEnv } from "@backend/__tests__/helpers/mock.setup";
import { setStripeClientForTests } from "@backend/billing/services/stripe.client";
import stripeService from "@backend/billing/services/stripe.service";
import mongoService from "@backend/common/services/mongo.service";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test";

const stripeConfigured = {
  STRIPE_SECRET_KEY: "rk_test_123",
  STRIPE_WEBHOOK_SECRET: "whsec_test",
  STRIPE_PRICE_ID: "price_test",
  FRONTEND_URL: "http://localhost:9080",
} as const;

describe("StripeService", () => {
  beforeAll(async () => {
    await setupTestDb(import.meta.url);
  });
  beforeEach(cleanupCollections);
  afterEach(() => {
    setStripeClientForTests(undefined);
  });
  afterAll(cleanupTestDb);

  it("creates a Checkout session in subscription mode with a trial", async () => {
    using _env = mockEnv(stripeConfigured);
    const userId = mongoService.objectId();
    await mongoService.user.insertOne({
      _id: userId,
      email: "pay@example.com",
      name: "Pay User",
      firstName: "Pay",
      lastName: "User",
      locale: "en",
    });

    const customersCreate = mock(() => Promise.resolve({ id: "cus_1" }));
    const sessionsCreate = mock(() =>
      Promise.resolve({ url: "https://checkout.stripe.com/c/session_1" }),
    );

    setStripeClientForTests({
      customers: { create: customersCreate },
      checkout: { sessions: { create: sessionsCreate } },
    } as unknown as Stripe);

    const result = await stripeService.createCheckoutSession(userId.toString());

    expect(result.url).toBe("https://checkout.stripe.com/c/session_1");
    expect(customersCreate).toHaveBeenCalled();
    const sessionArgs = sessionsCreate.mock.calls[0]?.[0] as {
      mode: string;
      client_reference_id: string;
      subscription_data: { trial_period_days: number };
      line_items: Array<{ price: string; quantity: number }>;
    };
    expect(sessionArgs.mode).toBe("subscription");
    expect(sessionArgs.client_reference_id).toBe(userId.toString());
    expect(sessionArgs.subscription_data.trial_period_days).toBe(7);
    expect(sessionArgs.line_items[0]?.price).toBe("price_test");
    expect(
      (sessionArgs as { payment_method_types?: unknown }).payment_method_types,
    ).toBeUndefined();

    const stored = await mongoService.user.findOne({ _id: userId });
    expect(stored?.billing?.stripeCustomerId).toBe("cus_1");
  });

  it("reuses an existing Stripe customer id", async () => {
    using _env = mockEnv(stripeConfigured);
    const userId = mongoService.objectId();
    await mongoService.user.insertOne({
      _id: userId,
      email: "pay@example.com",
      name: "Pay User",
      firstName: "Pay",
      lastName: "User",
      locale: "en",
      billing: {
        subscriptionStatus: "awaiting_checkout",
        stripeCustomerId: "cus_existing",
      },
    });

    const customersCreate = mock(() => Promise.resolve({ id: "cus_new" }));
    const sessionsCreate = mock(() =>
      Promise.resolve({ url: "https://checkout.stripe.com/c/session_2" }),
    );
    setStripeClientForTests({
      customers: { create: customersCreate },
      checkout: { sessions: { create: sessionsCreate } },
    } as unknown as Stripe);

    await stripeService.createCheckoutSession(userId.toString());

    expect(customersCreate).not.toHaveBeenCalled();
    const sessionArgs = sessionsCreate.mock.calls[0]?.[0] as {
      customer: string;
    };
    expect(sessionArgs.customer).toBe("cus_existing");
  });

  it("creates a billing portal session for an existing customer", async () => {
    using _env = mockEnv(stripeConfigured);
    const userId = mongoService.objectId();
    await mongoService.user.insertOne({
      _id: userId,
      email: "pay@example.com",
      name: "Pay User",
      firstName: "Pay",
      lastName: "User",
      locale: "en",
      billing: {
        subscriptionStatus: "trialing",
        stripeCustomerId: "cus_portal",
      },
    });

    const portalCreate = mock(() =>
      Promise.resolve({ url: "https://billing.stripe.com/p/session_1" }),
    );
    setStripeClientForTests({
      billingPortal: { sessions: { create: portalCreate } },
    } as unknown as Stripe);

    const result = await stripeService.createPortalSession(userId.toString());
    expect(result.url).toBe("https://billing.stripe.com/p/session_1");
    expect(portalCreate.mock.calls[0]?.[0]).toEqual({
      customer: "cus_portal",
      return_url: "http://localhost:9080",
    });
  });
});
