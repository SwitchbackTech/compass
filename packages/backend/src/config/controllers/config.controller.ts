import { type Request, type Response } from "express";
import { type AppConfig, AppConfigSchema } from "@core/types/config.types";
import { CONFIG } from "@backend/common/constants/config.constants";
import { isGoogleConfigured } from "@backend/common/constants/config.util";
import { getCloudMutationMode } from "@backend/common/services/sync-service/cloud-mutation-mode";
import { getConnectionDelegation } from "@backend/common/services/sync-service/connection-routing";

class ConfigController {
  get = (_req: Request<never, AppConfig, never, never>, res: Response) => {
    res.json(
      AppConfigSchema.parse({
        google: {
          isConfigured: isGoogleConfigured(CONFIG),
          connectDelegatedToSync: getConnectionDelegation() === "sync",
        },
        sync: {
          connectionRouting: CONFIG.SYNC_CONNECTION_ROUTING,
          eventRouting: CONFIG.SYNC_EVENT_ROUTING,
          cloudMutationMode: getCloudMutationMode(),
          execution: CONFIG.SYNC_EXECUTION,
        },
      }),
    );
  };
}

export default new ConfigController();
