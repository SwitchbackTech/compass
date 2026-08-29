import express from "express";
import rateLimit from "express-rate-limit";
import { verifySession } from "@backend/auth/session/session.middleware";
import { STRIPE_WEBHOOK_PATH } from "@backend/billing/billing.constants";
import billingController from "@backend/billing/controllers/billing.controller";
import billingWebhookController from "@backend/billing/controllers/billing.webhook.controller";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";

const sessionWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

const stripeWebhookLimiter = rateLimit({
  windowMs: 60_000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Stripe HMAC is over the exact request bytes. SuperTokens and
 * `express.json()` both parse JSON and would destroy the signature, so this
 * route must be mounted before those middlewares. `type: "*/ *"` keeps the
 * raw parser on this path even
if Stripe
's Content-Type includes a charset.
 */
export function mountStripeWebhook(app: express.Application): void {
  app.post(
    STRIPE_WEBHOOK_PATH,
    stripeWebhookLimiter,
    express.raw({ type: "*/*" }),
    billingWebhookController.handleStripe,
  );
}

/**
 * Billing routes: trial status, Stripe Checkout, ending a trial early,
 * and Billing Portal. The Stripe webhook is mounted separately, ahead of
 * body parsers; see `mountStripeWebhook`.
 */
export class BillingRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "BillingRoutes");
  }

  configureRoutes(): express.Application {
    this.app
      .route(`/api/billing/status`)
      .all(verifySession())
      .get(billingController.getStatus);

    this.app
      .route(`/api/billing/checkout/session`)
      .all(verifySession())
      .post(sessionWriteLimiter, billingController.createCheckoutSession);

    this.app
      .route(`/api/billing/trial/end`)
      .all(verifySession())
      .post(sessionWriteLimiter, billingController.endTrial);

    this.app
      .route(`/api/billing/portal/session`)
      .all(verifySession())
      .post(sessionWriteLimiter, billingController.createPortalSession);

    return this.app;
  }
}
