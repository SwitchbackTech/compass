import type express from "express";
import { verifySession } from "@backend/auth/session/session.middleware";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import eventsController from "./events-stream.controller";

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
