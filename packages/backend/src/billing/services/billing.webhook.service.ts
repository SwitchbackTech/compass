import type Stripe from "stripe";
import { Logger } from "@core/logger/winston.logger";
import {
  STRIPE_TO_COMPASS_STATUS,
  type StripeSubscriptionStatus,
} from "@backend/billing/billing.constants";
import { getStripeClient } from "@backend/billing/services/stripe.client";
import mongoService from "@backend/common/services/mongo.service";

const logger = Logger("app:billing.webhook");

const HANDLED_TYPES = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code: unknown }).code === 11000;

const toDate = (unixSeconds: number | null | undefined): Date | undefined =>
  typeof unixSeconds === "number" ? new Date(unixSeconds * 1000) : undefined;

const subscriptionIdOf = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.length > 0) return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as { id: unknown }).id === "string"
  ) {
    return (value as { id: string }).id;
  }
  return undefined;
};

const customerIdOf = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.length > 0) return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as { id: unknown }).id === "string"
  ) {
    return (value as { id: string }).id;
  }
  return undefined;
};

async function applySubscription(
  userId: string,
  subscription: Stripe.Subscription,
  eventCreatedAt: Date,
): Promise<void> {
  const status =
    STRIPE_TO_COMPASS_STATUS[subscription.status as StripeSubscriptionStatus];
  if (!status) {
    logger.warn(
      `Ignoring unmapped Stripe subscription status ${subscription.status}`,
    );
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const currentPeriodEnd = toDate(
    subscription.items.data[0]?.current_period_end ??
      (subscription as { current_period_end?: number }).current_period_end,
  );
  const trialEnd = toDate(subscription.trial_end ?? undefined);
  const trialStart = toDate(subscription.trial_start ?? undefined);

  await mongoService.user.updateOne(
    {
      _id: mongoService.objectId(userId),
      $or: [
        { "billing.lastStripeEventAt": { $lte: eventCreatedAt } },
        { "billing.lastStripeEventAt": { $exists: false } },
      ],
    },
    {
      $set: {
        "billing.subscriptionStatus": status,
        "billing.stripeCustomerId": customerIdOf(subscription.customer),
        "billing.stripeSubscriptionId": subscription.id,
        ...(priceId ? { "billing.stripePriceId": priceId } : {}),
        ...(currentPeriodEnd
          ? { "billing.currentPeriodEnd": currentPeriodEnd }
          : {}),
        "billing.cancelAtPeriodEnd": subscription.cancel_at_period_end,
        "billing.lastStripeEventAt": eventCreatedAt,
        ...(trialStart ? { "billing.trialStartedAt": trialStart } : {}),
        ...(trialEnd ? { "billing.trialEndsAt": trialEnd } : {}),
      },
    },
  );
}

async function findUserIdForSubscription(
  subscription: Stripe.Subscription,
  clientReferenceId?: string | null,
): Promise<string | null> {
  if (clientReferenceId) {
    return clientReferenceId;
  }

  const metadataUserId = subscription.metadata?.["compassUserId"];
  if (metadataUserId) return metadataUserId;

  const customerId = customerIdOf(subscription.customer);
  const bySubscription = await mongoService.user.findOne({
    "billing.stripeSubscriptionId": subscription.id,
  });
  if (bySubscription) return bySubscription._id.toString();

  if (customerId) {
    const byCustomer = await mongoService.user.findOne({
      "billing.stripeCustomerId": customerId,
    });
    if (byCustomer) return byCustomer._id.toString();
  }

  return null;
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  if (!HANDLED_TYPES.has(event.type)) return;

  const stripe = getStripeClient();
  const eventCreatedAt = toDate(event.created) ?? new Date();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const subscriptionId = subscriptionIdOf(session.subscription);
    if (!subscriptionId) {
      logger.warn("checkout.session.completed had no subscription id");
      return;
    }
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = await findUserIdForSubscription(
      subscription,
      session.client_reference_id,
    );
    if (!userId) {
      logger.warn(
        `No Compass user for checkout session ${session.id} (client_reference_id=${session.client_reference_id})`,
      );
      return;
    }
    await applySubscription(userId, subscription, eventCreatedAt);
    return;
  }

  const subscriptionId = subscriptionIdOf(event.data.object);
  if (!subscriptionId) {
    logger.warn(`${event.type} had no subscription id`);
    return;
  }
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = await findUserIdForSubscription(subscription);
  if (!userId) {
    logger.warn(
      `No Compass user for Stripe subscription ${subscriptionId} (${event.type})`,
    );
    return;
  }
  await applySubscription(userId, subscription, eventCreatedAt);
}

export async function processStripeEvent(event: Stripe.Event): Promise<void> {
  try {
    await mongoService.billingEvent.insertOne({
      _id: event.id,
      receivedAt: new Date(),
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return;
    }
    throw error;
  }

  try {
    await handleEvent(event);
  } catch (error) {
    await mongoService.billingEvent.deleteOne({ _id: event.id });
    throw error;
  }
}
