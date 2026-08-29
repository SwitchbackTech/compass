import mongoService from "@backend/common/services/mongo.service";

// Stripe retries webhooks for days, not months. Keep a generous dedupe window
// while ensuring webhook event ids do not become an unbounded permanent store.
export const BILLING_EVENT_RETENTION_SECONDS = 35 * 24 * 60 * 60;

export async function ensureBillingIndexes(): Promise<void> {
  await mongoService.billingEvent.createIndex(
    { receivedAt: 1 },
    {
      name: "billing_event_received_at_ttl",
      expireAfterSeconds: BILLING_EVENT_RETENTION_SECONDS,
    },
  );
}
