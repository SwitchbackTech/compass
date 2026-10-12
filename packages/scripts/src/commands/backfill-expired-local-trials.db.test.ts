import { backfillExpiredLocalTrials } from "@scripts/commands/backfill-expired-local-trials/backfill";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";

const NOW = new Date("2026-10-05T12:00:00.000Z");

describe("backfill-expired-local-trials (db)", () => {
  beforeAll(() => setupTestDb(import.meta.url));
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  it("dry-run lists stale rows without writing", async () => {
    await mongoService.user.insertOne({
      email: "stale@example.com",
      name: "Stale",
      firstName: "Stale",
      lastName: "Trial",
      locale: "en",
      billing: {
        subscriptionStatus: "trialing",
        trialEndsAt: new Date("2026-09-22T00:00:00.000Z"),
      },
    });
    await mongoService.user.insertOne({
      email: "active-local@example.com",
      name: "Active",
      firstName: "Active",
      lastName: "Trial",
      locale: "en",
      billing: {
        subscriptionStatus: "trialing",
        trialEndsAt: new Date("2026-10-10T00:00:00.000Z"),
      },
    });
    await mongoService.user.insertOne({
      email: "stripe@example.com",
      name: "Stripe",
      firstName: "Stripe",
      lastName: "Trial",
      locale: "en",
      billing: {
        subscriptionStatus: "trialing",
        stripeSubscriptionId: "sub_1",
        trialEndsAt: new Date("2026-08-01T00:00:00.000Z"),
      },
    });

    const report = await backfillExpiredLocalTrials(mongoService.user, {
      dryRun: true,
      batchSize: 500,
      now: NOW,
    });

    expect(report.matched).toBe(1);
    expect(report.changes).toEqual([
      {
        userId: expect.any(String),
        email: "stale@example.com",
        trialEndsAt: "2026-09-22T00:00:00.000Z",
        fromStatus: "trialing",
        toStatus: "expired",
      },
    ]);
    const stored = await mongoService.user.findOne({
      email: "stale@example.com",
    });
    expect(stored?.billing?.subscriptionStatus).toBe("trialing");
  });

  it("apply updates stale rows and is idempotent", async () => {
    await mongoService.user.insertOne({
      email: "stale@example.com",
      name: "Stale",
      firstName: "Stale",
      lastName: "Trial",
      locale: "en",
      billing: {
        subscriptionStatus: "trialing",
        trialEndsAt: new Date("2026-09-22T00:00:00.000Z"),
      },
    });

    const first = await backfillExpiredLocalTrials(mongoService.user, {
      dryRun: false,
      batchSize: 500,
      now: NOW,
      sleep: async () => undefined,
    });
    expect(first.modified).toBe(1);

    const stored = await mongoService.user.findOne({
      email: "stale@example.com",
    });
    expect(stored?.billing?.subscriptionStatus).toBe("expired");

    const second = await backfillExpiredLocalTrials(mongoService.user, {
      dryRun: false,
      batchSize: 500,
      now: NOW,
      sleep: async () => undefined,
    });
    expect(second.matched).toBe(0);
    expect(second.modified).toBe(0);
  });

  it("maps trialing without trialEndsAt to awaiting_checkout", async () => {
    await mongoService.user.insertOne({
      email: "missing-end@example.com",
      name: "Missing",
      firstName: "Missing",
      lastName: "End",
      locale: "en",
      billing: { subscriptionStatus: "trialing" },
    });

    const report = await backfillExpiredLocalTrials(mongoService.user, {
      dryRun: true,
      batchSize: 500,
      now: NOW,
    });

    expect(report.changes[0]?.toStatus).toBe("awaiting_checkout");
  });
});
