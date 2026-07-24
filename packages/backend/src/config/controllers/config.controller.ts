import { type Request, type Response } from "express";
import { type AppConfig, AppConfigSchema } from "@core/types/config.types";
import { CONFIG } from "@backend/common/constants/config.constants";
import { isGoogleConfigured } from "@backend/common/constants/config.util";
import { getConnectionDelegation } from "@backend/common/services/sync-service/connection-routing";

class ConfigController {
  get = (_req: Request<never, AppConfig, never, never>, res: Response) => {
    res.json(
      AppConfigSchema.parse({
        google: {
          isConfigured: isGoogleConfigured(CONFIG),
          connectDelegatedToSync: getConnectionDelegation() === "sync",
        },
      }),
    );
  };
}

export default new ConfigController();
