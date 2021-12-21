import express from "express";

import { CommonRoutesConfig } from "@common/common.routes.config";
import jwtMiddleware from "@auth/middleware/jwt.middleware";

import calendarController from "./controllers/calendar.controller";

export class CalendarRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "CalendarRoutes");
  }

  configureRoutes(): express.Application {
    this.app
      .route(`/calendar/list`)
      .all(jwtMiddleware.verifyTokenAndSaveUserId)
      .get(calendarController.list);

    return this.app;
  }
}
