import express from "express";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import jwtMiddleware from "@backend/auth/middleware/jwt.middleware";

import calendarController from "./controllers/calendar.controller";

export class CalendarRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "CalendarRoutes");
  }

  configureRoutes(): express.Application {
    this.app
      .route(`/api/calendarlist`)
      .all(jwtMiddleware.verifyTokenAndSaveUserId)
      .get(calendarController.list)
      .post(calendarController.create);
    return this.app;
  }
}
