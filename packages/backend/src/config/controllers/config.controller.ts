import { type Request, type Response } from "express";
import { type AppConfig, AppConfigSchema } from "@core/types/config.types";
import {
  ENV,
  isGoogleConfigured,
} from "@backend/common/constants/env.constants";

class ConfigController {
  get = (_req: Request<never, AppConfig, never, never>, res: Response) => {
    res.json(
      AppConfigSchema.parse({
        google: {
          isConfigured: isGoogleConfigured(ENV),
        },
      }),
    );
  };
}

export default new ConfigController();
