import type express from "express";
import rateLimit from "express-rate-limit";
import { verifySession } from "@backend/auth/session/session.middleware";
import bookingController from "@backend/booking/controllers/booking.controller";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";

const bookingSlugKey = (req: express.Request): string =>
  `${req.ip ?? "unknown"}:${req.params["slug"] ?? "unknown"}`;

const publicSlotsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: bookingSlugKey,
});

const publicConfirmLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: bookingSlugKey,
});

/**
 * Host admin routes require a session. Public guest routes are unauthenticated.
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

    this.app
      .route(`/api/booking/pages/:slug`)
      .get(bookingController.getPublicPage);

    this.app
      .route(`/api/booking/pages/:slug/slots`)
      .get(publicSlotsLimiter, bookingController.getPublicSlots);

    this.app
      .route(`/api/booking/pages/:slug/reservations`)
      .post(publicConfirmLimiter, bookingController.createReservation);

    this.app
      .route(`/api/booking/reservations/:id/cancel`)
      .post(bookingController.cancelReservation);

    return this.app;
  }
}
