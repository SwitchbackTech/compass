import type express from "express";
import { verifySession } from "@backend/auth/session/session.middleware";
import bookingController from "@backend/booking/controllers/booking.controller";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";

/**
 * Authenticated host booking page routes (WP-03). Public guest routes land in
 * WP-06.
 */
export class BookingRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "BookingRoutes");
  }

  configureRoutes(): express.Application {
    this.app
      .route(`/api/booking/page`)
      .all(verifySession())
      .get(bookingController.getPage)
      .put(bookingController.putPage);

    return this.app;
  }
}
