import { backfillBilling } from "@scripts/commands/backfill-billing/backfill";
import { BILLING_PLAN } from "@core/constants/billing.constants";
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

const CUTOFF = new Date("2026-08-13T00:00:00.000Z");
const NOW = new Date("2026-08-13T12:00:00.000Z");

describe("backfill-billing (db)", () => {
  beforeAll(() => setupTestDb(import.meta.url));
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  it("dry-run reports matches without writing", async () => {
    await mongoService.user.insertOne({
      email: "old@example.com",
      name: "Old",
      firstName: "Old",
      lastName: "User",
      locale: "en",
      signedUpAt: new Date("2026-08-01T00:00:00.000Z"),
    });

    const report = await backfillBilling(mongoService.user, {
      dryRun: true,
      cutoff: CUTOFF,
      batchSize: 500,
      now: NOW,
    });

    expect(report.matched).toBe(1);
    expect(report.modified).toBe(0);
    const stored = await mongoService.user.findOne({
      email: "old@example.com",
    });
    expect(stored?.billing).toBeUndefined();
  });

  it("stamps awaiting_checkout and is idempotent", async () => {
    await mongoService.user.insertOne({
      email: "old@example.com",
      name: "Old",
      firstName: "Old",
      lastName: "User",
      locale: "en",
      signedUpAt: new Date("2026-08-01T00:00:00.000Z"),
    });
    await mongoService.user.insertOne({
      email: "paid@example.com",
      name: "Paid",
      firstName: "Paid",
      lastName: "User",
      locale: "en",
      signedUpAt: new Date("2026-08-01T00:00:00.000Z"),
      billing: { subscriptionStatus: "active" },
    });

    const first = await backfillBilling(mongoService.user, {
      dryRun: false,
      cutoff: CUTOFF,
      batchSize: 500,
      now: NOW,
      sleep: async () => undefined,
    });
    expect(first.modified).toBe(1);

    const stored = await mongoService.user.findOne({
      email: "old@example.com",
    });
    expect(stored?.billing?.subscriptionStatus).toBe("awaiting_checkout");
    expect(stored?.billing?.backfilledAt).toEqual(NOW);
    expect(stored?.billing?.stripeSubscriptionId).toBeUndefined();
    expect(stored?.billing?.trialEndsAt).toBeUndefined();

    const second = await backfillBilling(mongoService.user, {
      dryRun: false,
      cutoff: CUTOFF,
      batchSize: 500,
      now: NOW,
      sleep: async () => undefined,
    });
    expect(second.modified).toBe(0);
  });

  it("includes accounts signed up after an old cutoff when using the default far-future cutoff", async () => {
    await mongoService.user.insertOne({
      email: "today@example.com",
      name: "Today",
      firstName: "Today",
      lastName: "User",
      locale: "en",
      signedUpAt: NOW,
    });

    const report = await backfillBilling(mongoService.user, {
      dryRun: true,
      cutoff: new Date(BILLING_PLAN.BACKFILL_CUTOFF),
      batchSize: 500,
      now: NOW,
    });

    expect(report.matched).toBe(1);
  });
});
