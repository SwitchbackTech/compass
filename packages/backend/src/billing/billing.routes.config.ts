import type express from "express";
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
 * Billing routes: trial status, Stripe Checkout, Billing Portal, and the
 * unauthenticated Stripe webhook.
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
      .route(`/api/billing/portal/session`)
      .all(verifySession())
      .post(sessionWriteLimiter, billingController.createPortalSession);

    this.app
      .route(STRIPE_WEBHOOK_PATH)
      .post(stripeWebhookLimiter, billingWebhookController.handleStripe);

    return this.app;
  }
}
