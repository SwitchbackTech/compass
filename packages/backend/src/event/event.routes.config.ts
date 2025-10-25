import express from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import authMiddleware from "@backend/auth/middleware/auth.middleware";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import eventController from "@backend/event/controllers/event.controller";
import { EventMiddleware } from "@backend/event/middleware/event.middleware";

export class EventRoutes extends CommonRoutesConfig {
  private routePrefix = "/api/calendars/:calendar/events";
  private router = express.Router();

  constructor(app: express.Application) {
    super(app, "EventRoutes");
  }

  configureRoutes(): express.Application {
    this.router.use(verifySession(), EventMiddleware.verifyUserCalendar);

    this.router
      .route("/")
      .get(eventController.readAll)
      .post(eventController.create);

    this.router.delete("/delete-many", eventController.deleteMany);
    this.router.put("/reorder", eventController.reorder);

    this.router
      .use(authMiddleware.verifyIsDev)
      .delete("/:user", eventController.deleteAllByUser);

    this.router
      .route("/:id")
      .get(eventController.readById)
      .put(eventController.update)
      .delete(eventController.delete);

    this.app.use(`${this.routePrefix}/events`, this.router);

    return this.app;
  }
}
