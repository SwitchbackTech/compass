import express from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import authMiddleware from "@backend/auth/middleware/auth.middleware";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import eventController from "@backend/event/controllers/event.controller";
import { EventMiddleware } from "@backend/event/middleware/event.middleware";

export class EventRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "EventRoutes");
  }

  configureRoutes(): express.Application {
    const routePrefix = "/api/calendars/:calendar/events";
    const router = express.Router();

    router.use(verifySession(), EventMiddleware.verifyUserCalendar);

    router.route("/").get(eventController.readAll).post(eventController.create);

    router.delete("/delete-many", eventController.deleteMany);
    router.put("/reorder", eventController.reorder);

    router
      .use(authMiddleware.verifyIsDev)
      .delete("/:user", eventController.deleteAllByUser);

    router
      .route("/:id")
      .get(eventController.readById)
      .put(eventController.update)
      .delete(eventController.delete);

    this.app.use(`${routePrefix}/events`, router);

    return this.app;
  }
}
