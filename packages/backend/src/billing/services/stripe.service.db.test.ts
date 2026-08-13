import Stripe from "stripe";
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
      (sessionArgs as { payment_method_collection?: string })
        .payment_method_collection,
    ).toBe("always");
    expect(
      (sessionArgs as { payment_method_types?: unknown }).payment_method_types,
    ).toBeUndefined();
    expect(sessionsCreate.mock.calls[0]?.[1]).toEqual({
      idempotencyKey: `compass-checkout-v2-${userId.toString()}`,
    });

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

  it("sends an incomplete Checkout (awaiting_checkout with a subscription id) to the portal", async () => {
    using _env = mockEnv(stripeConfigured);
    const userId = mongoService.objectId();
    await mongoService.user.insertOne({
      _id: userId,
      email: "incomplete@example.com",
      name: "Incomplete User",
      firstName: "Incomplete",
      lastName: "User",
      locale: "en",
      billing: {
        subscriptionStatus: "awaiting_checkout",
        stripeCustomerId: "cus_incomplete",
        stripeSubscriptionId: "sub_incomplete",
      },
    });

    const sessionsCreate = mock(() =>
      Promise.resolve({ url: "https://checkout.stripe.com/c/session_5" }),
    );
    const portalCreate = mock(() =>
      Promise.resolve({
        url: "https://billing.stripe.com/p/session_incomplete",
      }),
    );
    setStripeClientForTests({
      checkout: { sessions: { create: sessionsCreate } },
      billingPortal: { sessions: { create: portalCreate } },
    } as unknown as Stripe);

    const result = await stripeService.createCheckoutSession(userId.toString());

    expect(result.url).toBe("https://billing.stripe.com/p/session_incomplete");
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("omits trial_period_days when the user already had a Stripe subscription", async () => {
    using _env = mockEnv(stripeConfigured);
    const userId = mongoService.objectId();
    await mongoService.user.insertOne({
      _id: userId,
      email: "expired@example.com",
      name: "Expired User",
      firstName: "Expired",
      lastName: "User",
      locale: "en",
      billing: {
        subscriptionStatus: "expired",
        stripeCustomerId: "cus_expired",
        stripeSubscriptionId: "sub_old",
      },
    });

    const sessionsCreate = mock(() =>
      Promise.resolve({ url: "https://checkout.stripe.com/c/session_3" }),
    );
    setStripeClientForTests({
      customers: { create: mock() },
      checkout: { sessions: { create: sessionsCreate } },
    } as unknown as Stripe);

    await stripeService.createCheckoutSession(userId.toString());

    const sessionArgs = sessionsCreate.mock.calls[0]?.[0] as {
      subscription_data: { trial_period_days?: number };
    };
    expect(sessionArgs.subscription_data.trial_period_days).toBeUndefined();
  });

  it("sends a live subscriber to the Billing Portal instead of a second Checkout", async () => {
    using _env = mockEnv(stripeConfigured);
    const userId = mongoService.objectId();
    await mongoService.user.insertOne({
      _id: userId,
      email: "live@example.com",
      name: "Live User",
      firstName: "Live",
      lastName: "User",
      locale: "en",
      billing: {
        subscriptionStatus: "active",
        stripeCustomerId: "cus_live",
        stripeSubscriptionId: "sub_live",
      },
    });

    const sessionsCreate = mock(() =>
      Promise.resolve({ url: "https://checkout.stripe.com/c/session_4" }),
    );
    const portalCreate = mock(() =>
      Promise.resolve({ url: "https://billing.stripe.com/p/session_live" }),
    );
    setStripeClientForTests({
      checkout: { sessions: { create: sessionsCreate } },
      billingPortal: { sessions: { create: portalCreate } },
    } as unknown as Stripe);

    const result = await stripeService.createCheckoutSession(userId.toString());

    expect(result.url).toBe("https://billing.stripe.com/p/session_live");
    expect(sessionsCreate).not.toHaveBeenCalled();
    expect(portalCreate).toHaveBeenCalled();
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

  it("maps a Stripe invalid-request error to BillingHttpError", async () => {
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

    const stripeError = new Stripe.errors.StripeInvalidRequestError({
      message: "No such price: 'price_test'",
      type: "invalid_request_error",
      statusCode: 400,
    });
    setStripeClientForTests({
      customers: {
        create: mock(() => Promise.resolve({ id: "cus_1" })),
      },
      checkout: {
        sessions: {
          create: mock(() => Promise.reject(stripeError)),
        },
      },
    } as unknown as Stripe);

    await expect(
      stripeService.createCheckoutSession(userId.toString()),
    ).rejects.toMatchObject({
      name: "BillingHttpError",
      status: 400,
      clientMessage: "Couldn't start billing. Please try again in a moment.",
    });
  });
});
