import { type Request, type Response } from "express";
import type Stripe from "stripe";
import { Status } from "@core/errors/status.codes";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { mockEnv } from "@backend/__tests__/helpers/mock.setup";
import billingWebhookController from "@backend/billing/controllers/billing.webhook.controller";
import { processStripeEvent } from "@backend/billing/services/billing.webhook.service";
import { setStripeClientForTests } from "@backend/billing/services/stripe.client";
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
};

const jsonRes = () => {
  const json = mock();
  const res = {
    status: mock().mockReturnThis(),
    json,
  } as unknown as Response;
  return { res, json };
};

const subscription = (overrides: Partial<Stripe.Subscription> = {}) =>
  ({
    id: "sub_1",
    status: "trialing",
    customer: "cus_1",
    cancel_at_period_end: false,
    trial_start: 1_775_000_000,
    trial_end: 1_775_604_800,
    metadata: { compassUserId: "" },
    items: {
      data: [
        {
          price: { id: "price_test" },
          current_period_end: 1_778_196_800,
        },
      ],
    },
    ...overrides,
  }) as unknown as Stripe.Subscription;

describe("Stripe webhook", () => {
  beforeAll(async () => {
    await setupTestDb(import.meta.url);
  });
  beforeEach(cleanupCollections);
  afterEach(() => {
    setStripeClientForTests(undefined);
  });
  afterAll(cleanupTestDb);

  it("rejects a non-Buffer body so a parsed JSON payload cannot pass", async () => {
    using _env = mockEnv(stripeConfigured);
    const { res, json } = jsonRes();
    await billingWebhookController.handleStripe(
      { body: { id: "evt_1" }, headers: {} } as unknown as Request,
      res,
    );

    expect((res.status as ReturnType<typeof mock>).mock.calls[0]?.[0]).toBe(
      Status.BAD_REQUEST,
    );
    expect(json).toHaveBeenCalledWith({ error: "Invalid webhook payload" });
  });

  it("returns 400 for a bad signature", async () => {
    using _env = mockEnv(stripeConfigured);
    setStripeClientForTests({
      webhooks: {
        constructEvent: () => {
          throw new Error(
            "No signatures found matching the expected signature",
          );
        },
      },
    } as unknown as Stripe);

    const { res, json } = jsonRes();
    await billingWebhookController.handleStripe(
      {
        body: Buffer.from("{}"),
        headers: { "stripe-signature": "bad" },
      } as unknown as Request,
      res,
    );

    expect((res.status as ReturnType<typeof mock>).mock.calls[0]?.[0]).toBe(
      Status.BAD_REQUEST,
    );
    expect(json.mock.calls[0]?.[0]).toEqual({
      error: "No signatures found matching the expected signature",
    });
  });

  it("links customer and subscription ids from checkout.session.completed", async () => {
    using _env = mockEnv(stripeConfigured);
    const userId = mongoService.objectId();
    await mongoService.user.insertOne({
      _id: userId,
      email: "new@example.com",
      name: "New",
      firstName: "New",
      lastName: "User",
      locale: "en",
      billing: { subscriptionStatus: "awaiting_checkout" },
    });

    setStripeClientForTests({
      subscriptions: {
        retrieve: mock(() =>
          Promise.resolve(
            subscription({
              metadata: { compassUserId: userId.toString() },
            }),
          ),
        ),
      },
    } as unknown as Stripe);

    await processStripeEvent({
      id: "evt_checkout_1",
      type: "checkout.session.completed",
      created: 1_775_000_100,
      data: {
        object: {
          id: "cs_1",
          client_reference_id: userId.toString(),
          customer: "cus_1",
          subscription: "sub_1",
        },
      },
    } as unknown as Stripe.Event);

    const stored = await mongoService.user.findOne({ _id: userId });
    expect(stored?.billing?.subscriptionStatus).toBe("trialing");
    expect(stored?.billing?.stripeCustomerId).toBe("cus_1");
    expect(stored?.billing?.stripeSubscriptionId).toBe("sub_1");
  });

  it("acks a duplicate delivery without a second write", async () => {
    using _env = mockEnv(stripeConfigured);
    const userId = mongoService.objectId();
    await mongoService.user.insertOne({
      _id: userId,
      email: "dup@example.com",
      name: "Dup",
      firstName: "Dup",
      lastName: "User",
      locale: "en",
      billing: { subscriptionStatus: "awaiting_checkout" },
    });

    const retrieve = mock(() => Promise.resolve(subscription()));
    setStripeClientForTests({
      subscriptions: { retrieve },
    } as unknown as Stripe);

    const event = {
      id: "evt_dup_1",
      type: "customer.subscription.updated",
      created: 1_775_000_100,
      data: { object: { id: "sub_1", customer: "cus_1" } },
    } as unknown as Stripe.Event;

    await mongoService.user.updateOne(
      { _id: userId },
      { $set: { "billing.stripeSubscriptionId": "sub_1" } },
    );

    await processStripeEvent(event);
    await processStripeEvent(event);

    expect(retrieve).toHaveBeenCalledTimes(1);
    expect(await mongoService.billingEvent.countDocuments()).toBe(1);
  });

  it("ignores a stale event whose created time is older than lastStripeEventAt", async () => {
    using _env = mockEnv(stripeConfigured);
    const userId = mongoService.objectId();
    const newer = new Date("2026-08-12T00:00:00.000Z");
    await mongoService.user.insertOne({
      _id: userId,
      email: "stale@example.com",
      name: "Stale",
      firstName: "Stale",
      lastName: "User",
      locale: "en",
      billing: {
        subscriptionStatus: "active",
        stripeSubscriptionId: "sub_1",
        stripeCustomerId: "cus_1",
        lastStripeEventAt: newer,
      },
    });

    setStripeClientForTests({
      subscriptions: {
        retrieve: mock(() =>
          Promise.resolve(subscription({ status: "canceled" })),
        ),
      },
    } as unknown as Stripe);

    await processStripeEvent({
      id: "evt_stale_1",
      type: "customer.subscription.updated",
      created: Math.floor(newer.getTime() / 1000) - 90,
      data: { object: { id: "sub_1" } },
    } as unknown as Stripe.Event);

    const stored = await mongoService.user.findOne({ _id: userId });
    expect(stored?.billing?.subscriptionStatus).toBe("active");
  });
});
