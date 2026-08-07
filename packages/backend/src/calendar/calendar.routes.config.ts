import { type Application } from "express";
import { verifySession } from "@backend/auth/session/session.middleware";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import calendarController from "./controllers/calendar.controller";

export class CalendarRoutes extends CommonRoutesConfig {
  constructor(app: Application) {
    super(app, "CalendarRoutes");
  }

  configureRoutes() {
    this.app
      .route(`/api/calendars`)
      .all(verifySession())
      .get(calendarController.list);

    this.app
      .route(`/api/calendars/availability`)
      .all(verifySession())
      .get(calendarController.availability);

    return this.app;
  }
}
