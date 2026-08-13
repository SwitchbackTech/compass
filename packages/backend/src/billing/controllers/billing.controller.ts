import { type Request, type Response } from "express";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import {
  type BillingCheckoutResponse,
  type BillingPortalResponse,
  type BillingStatusResponse,
} from "@core/types/billing.types";
import { zObjectId } from "@core/types/type.utils";
import billingService from "@backend/billing/services/billing.service";
import stripeService from "@backend/billing/services/stripe.service";

const logger = Logger("app:billing");

const sendBillingError = (res: Response, e: unknown) => {
  const message = e instanceof Error ? e.message : "Unexpected error";
  if (message === "User not found") {
    res.status(Status.NOT_FOUND).json({ error: "User not found" });
    return;
  }
  logger.error(message, e);
  res.status(Status.INTERNAL_SERVER).json({ error: "Internal server error" });
};

class BillingController {
  getStatus = async (
    req: Request<never, BillingStatusResponse, never, never>,
    res: Response<BillingStatusResponse | { error: string }>,
  ) => {
    try {
      const userId = zObjectId.parse(req.session?.getUserId());
      const status = await billingService.getStatus(userId.toString());
      res.status(Status.OK).json(status);
    } catch (e) {
      sendBillingError(res, e);
    }
  };

  startTrial = async (
    req: Request<never, BillingStatusResponse, never, never>,
    res: Response<BillingStatusResponse | { error: string }>,
  ) => {
    try {
      const userId = zObjectId.parse(req.session?.getUserId());
      const status = await billingService.startTrial(userId.toString());
      res.status(Status.OK).json(status);
    } catch (e) {
      sendBillingError(res, e);
    }
  };

  createCheckoutSession = async (
    req: Request<never, BillingCheckoutResponse, never, never>,
    res: Response<BillingCheckoutResponse | { error: string }>,
  ) => {
    try {
      const userId = zObjectId.parse(req.session?.getUserId());
      const result = await stripeService.createCheckoutSession(
        userId.toString(),
      );
      res.status(Status.OK).json(result);
    } catch (e) {
      sendBillingError(res, e);
    }
  };

  createPortalSession = async (
    req: Request<never, BillingPortalResponse, never, never>,
    res: Response<BillingPortalResponse | { error: string }>,
  ) => {
    try {
      const userId = zObjectId.parse(req.session?.getUserId());
      const result = await stripeService.createPortalSession(userId.toString());
      res.status(Status.OK).json(result);
    } catch (e) {
      sendBillingError(res, e);
    }
  };
}

export default new BillingController();
