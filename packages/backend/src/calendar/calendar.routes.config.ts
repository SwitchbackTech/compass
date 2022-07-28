import express from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";

import calendarController from "./controllers/calendar.controller";

export class CalendarRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "CalendarRoutes");
  }

  configureRoutes(): express.Application {
    this.app
      .route(`/api/calendarlist`)
      .all(verifySession())
      .get(calendarController.list)
      .post(calendarController.create);
    return this.app;
  }
}
