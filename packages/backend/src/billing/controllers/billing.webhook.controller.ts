import { type Request, type Response } from "express";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import { processStripeEvent } from "@backend/billing/services/billing.webhook.service";
import { getStripeClient } from "@backend/billing/services/stripe.client";
import { CONFIG } from "@backend/common/constants/config.constants";
import { isStripeConfigured } from "@backend/common/constants/config.util";

const logger = Logger("app:billing.webhook");

class BillingWebhookController {
  handleStripe = async (req: Request, res: Response) => {
    if (!isStripeConfigured(CONFIG) || !CONFIG.STRIPE_WEBHOOK_SECRET) {
      res.status(Status.NOT_FOUND).json({ error: "Stripe is not configured" });
      return;
    }

    if (!Buffer.isBuffer(req.body)) {
      logger.error(
        "Stripe webhook body was not a Buffer; signature verification cannot run",
      );
      res.status(Status.BAD_REQUEST).json({ error: "Invalid webhook payload" });
      return;
    }

    const signature = req.headers["stripe-signature"];
    if (typeof signature !== "string" || signature.length === 0) {
      res
        .status(Status.BAD_REQUEST)
        .json({ error: "Missing Stripe signature" });
      return;
    }

    try {
      const event = getStripeClient().webhooks.constructEvent(
        req.body,
        signature,
        CONFIG.STRIPE_WEBHOOK_SECRET,
      );
      await processStripeEvent(event);
      res.status(Status.OK).json({ received: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Webhook error";
      logger.error(message, e);
      res.status(Status.BAD_REQUEST).json({ error: message });
    }
  };
}

export default new BillingWebhookController();
