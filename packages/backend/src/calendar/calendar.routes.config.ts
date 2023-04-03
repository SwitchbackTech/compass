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
      .route(`/api/calendarlist`)
      .all(verifySession())
      //@ts-ignore
      .get(calendarController.list)
      //@ts-ignore
      .post(calendarController.create);
    return this.app;
  }
}
