import type express from "express";
import rateLimit from "express-rate-limit";
import { type SessionRequest } from "supertokens-node/framework/express";
import { isBookingEnabled } from "@core/util/env.util";
import { verifySession } from "@backend/auth/session/session.middleware";
import bookingController from "@backend/booking/controllers/booking.controller";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import { CONFIG } from "@backend/common/constants/config.constants";

const bookingSlugKey = (req: express.Request): string =>
  `${req.ip ?? "unknown"}:${req.params["slug"] ?? "unknown"}`;

const publicPageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: bookingSlugKey,
});

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

const bookingReservationKey = (req: express.Request): string =>
  `${req.ip ?? "unknown"}:${req.params["id"] ?? "unknown"}`;

const publicReservationGetLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: bookingReservationKey,
});

const publicCancelLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: bookingReservationKey,
});

const publicReservationPatchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: bookingReservationKey,
});

const bookingAdminKey = (req: express.Request): string =>
  `booking-admin:${(req as SessionRequest).session?.getUserId?.() ?? "unknown"}`;

// GET is Settings load/poll; 60/min matches the public page read budget.
const adminPageGetLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: bookingAdminKey,
});

// PUT is a save. A host retries a handful of times, not sixty.
const adminPagePutLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: bookingAdminKey,
});

/**
 * Host admin routes require a session. Public guest routes are unauthenticated.
 */
export class BookingRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "BookingRoutes");
  }

  configureRoutes(): express.Application {
    if (!isBookingEnabled(CONFIG.NODE_ENV)) {
      return this.app;
    }

    this.app
      .route(`/api/booking/page`)
      .all(verifySession())
      .get(adminPageGetLimiter, bookingController.getPage)
      .put(adminPagePutLimiter, bookingController.putPage);

    this.app
      .route(`/api/booking/pages/:slug`)
      .get(publicPageLimiter, bookingController.getPublicPage);

    this.app
      .route(`/api/booking/pages/:slug/slots`)
      .get(publicSlotsLimiter, bookingController.getPublicSlots);

    this.app
      .route(`/api/booking/pages/:slug/reservations`)
      .post(publicConfirmLimiter, bookingController.createReservation);

    this.app
      .route(`/api/booking/reservations/:id`)
      .get(publicReservationGetLimiter, bookingController.getPublicReservation)
      .patch(
        publicReservationPatchLimiter,
        bookingController.patchPublicReservation,
      );

    this.app
      .route(`/api/booking/reservations/:id/cancel`)
      .post(publicCancelLimiter, bookingController.cancelReservation);

    return this.app;
  }
}
