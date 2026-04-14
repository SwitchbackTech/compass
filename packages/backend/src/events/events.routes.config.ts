import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import type express from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import eventsController from "./controllers/events.controller";

export class EventsRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "EventsRoutes");
  }

  configureRoutes(): express.Application {
    this.app
      .route("/api/events/stream")
      .all(verifySession())
      .get(eventsController.streamEvents);

    return this.app;
  }
}
