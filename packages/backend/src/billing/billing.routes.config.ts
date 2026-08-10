import type express from "express";
import rateLimit from "express-rate-limit";
import { verifySession } from "@backend/auth/session/session.middleware";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import billingController from "./controllers/billing.controller";

// A user can only ever start their own trial once (see billing.service's
// idempotent startTrial), but this still gates the endpoint against a
// retry storm or scripted abuse the same way any other write route should.
const startTrialLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Billing Routes Configuration
 *
 * Trial state only today -- no payment collection or Stripe webhooks yet.
 * See compass-calendar-internal/projects/keyboard-education/03-monetization-trial-checkout.md
 * for what remains before this is a real checkout flow.
 */
export class BillingRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "BillingRoutes");
  }

  configureRoutes(): express.Application {
    /**
     * GET /api/billing/status
     * Returns the current user's trial/subscription status.
     *
     * @auth Required - Supertokens session
     */
    this.app
      .route(`/api/billing/status`)
      .all(verifySession())
      .get(billingController.getStatus);

    /**
     * POST /api/billing/trial/start
     * Starts a trial for the current user. Idempotent: a user who already
     * has one does not get a second, later window.
     *
     * @auth Required - Supertokens session
     */
    this.app
      .route(`/api/billing/trial/start`)
      .all(verifySession())
      .post(startTrialLimiter, billingController.startTrial);

    return this.app;
  }
}
