import { type Request, type Response } from "express";
import { BILLING_PLAN } from "@core/constants/billing.constants";
import { type AppConfig, AppConfigSchema } from "@core/types/config.types";
import { CONFIG } from "@backend/common/constants/config.constants";
import {
  isGoogleConfigured,
  isStripeConfigured,
} from "@backend/common/constants/config.util";
import { getCloudMutationMode } from "@backend/common/services/sync-service/cloud-mutation-mode";

class ConfigController {
  get = (_req: Request<never, AppConfig, never, never>, res: Response) => {
    res.json(
      AppConfigSchema.parse({
        google: {
          isConfigured: isGoogleConfigured(CONFIG),
        },
        sync: {
          cloudMutationMode: getCloudMutationMode(),
          execution: CONFIG.SYNC_EXECUTION,
        },
        billing: {
          isConfigured: isStripeConfigured(CONFIG),
          priceDisplay: BILLING_PLAN.PRICE_DISPLAY,
          trialLengthDays: BILLING_PLAN.TRIAL_LENGTH_DAYS,
        },
      }),
    );
  };
}

export default new ConfigController();
