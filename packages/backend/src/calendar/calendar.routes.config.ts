import { Application } from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
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
      .get(calendarController.list)
      .post(calendarController.create);

    this.app
      .route(`/api/calendars/select`)
      .all(verifySession())
      .put(calendarController.toggleSelection);

    return this.app;
  }
}
