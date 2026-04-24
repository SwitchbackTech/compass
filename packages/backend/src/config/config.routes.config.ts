import type express from "express";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import configController from "./controllers/config.controller";

export class ConfigRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "ConfigRoutes");
  }

  configureRoutes(): express.Application {
    this.app.route(`/api/config`).get(configController.get);

    return this.app;
  }
}
