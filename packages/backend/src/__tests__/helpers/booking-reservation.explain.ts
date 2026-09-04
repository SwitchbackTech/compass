import { type ObjectId } from "mongodb";
import mongoService from "@backend/common/services/mongo.service";

/** Planner for the windowed confirmed scan WP-14 uses. */
export const explainWindowedConfirmedReservationScan = (
  pageId: ObjectId,
  range: { from: Date; to: Date },
) =>
  mongoService.bookingReservation
    .find({
      pageId,
      status: "confirmed",
      slotStart: { $gte: range.from, $lt: range.to },
    })
    .explain("queryPlanner");
