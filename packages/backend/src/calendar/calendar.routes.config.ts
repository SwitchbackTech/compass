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
      .route(`/calendar/list`)
      .all(jwtMiddleware.verifyTokenAndSaveUserId)
      .get(calendarController.list);

    this.app
      .route(`/calendar/`)
      .all(jwtMiddleware.verifyTokenAndSaveUserId)
      .post(calendarController.create);

    return this.app;
  }
}
