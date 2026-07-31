import { type Request, type Response } from "express";
import { type AppConfig, AppConfigSchema } from "@core/types/config.types";
import { CONFIG } from "@backend/common/constants/config.constants";
import { isGoogleConfigured } from "@backend/common/constants/config.util";
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
      }),
    );
  };
}

export default new ConfigController();
