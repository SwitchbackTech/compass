import { type Request, type Response } from "express";
import { type AppConfig, AppConfigSchema } from "@core/types/config.types";
import {
  CONFIG,
  isGoogleConfigured,
} from "@backend/common/constants/config.constants";

class ConfigController {
  get = (_req: Request<never, AppConfig, never, never>, res: Response) => {
    res.json(
      AppConfigSchema.parse({
        google: {
          isConfigured: isGoogleConfigured(CONFIG),
        },
      }),
    );
  };
}

export default new ConfigController();
