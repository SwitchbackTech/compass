import { type Request, type Response } from "express";
import { Status } from "@core/errors/status.codes";
import { type BillingStatusResponse } from "@core/types/billing.types";
import { zObjectId } from "@core/types/type.utils";
import billingService from "@backend/billing/services/billing.service";

class BillingController {
  getStatus = async (
    req: Request<never, BillingStatusResponse, never, never>,
    res: Response<BillingStatusResponse>,
  ) => {
    try {
      const userId = zObjectId.parse(req.session?.getUserId());
      const status = await billingService.getStatus(userId.toString());
      res.status(Status.OK).json(status);
    } catch {
      res.status(Status.INTERNAL_SERVER).send();
    }
  };

  startTrial = async (
    req: Request<never, BillingStatusResponse, never, never>,
    res: Response<BillingStatusResponse>,
  ) => {
    try {
      const userId = zObjectId.parse(req.session?.getUserId());
      const status = await billingService.startTrial(userId.toString());
      res.status(Status.OK).json(status);
    } catch {
      res.status(Status.INTERNAL_SERVER).send();
    }
  };
}

export default new BillingController();
