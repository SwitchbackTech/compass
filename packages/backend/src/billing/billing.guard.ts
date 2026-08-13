import { deriveBillingStatus } from "@backend/billing/services/billing.service";
import { CONFIG } from "@backend/common/constants/config.constants";
import { isStripeConfigured } from "@backend/common/constants/config.util";
import mongoService from "@backend/common/services/mongo.service";
import { eventMutationError } from "@backend/event/event.error";

/**
 * Throw BILLING_REQUIRED (403) when the user cannot mutate events.
 * No-ops when Stripe is unconfigured so self-host stays fully writable.
 * Lives in controllers, not the shared `/api/event` route chain, so GET
 * stays open.
 */
export async function assertBillingAllowsWrites(userId: string): Promise<void> {
  if (!isStripeConfigured(CONFIG)) return;

  const user = await mongoService.user.findOne(
    { _id: mongoService.objectId(userId) },
    { projection: { billing: 1 } },
  );
  const status = deriveBillingStatus(user?.billing, new Date());
  if (!status.isReadOnly) return;

  throw eventMutationError(
    "BILLING_REQUIRED",
    "A paid subscription is required to make changes",
  );
}
