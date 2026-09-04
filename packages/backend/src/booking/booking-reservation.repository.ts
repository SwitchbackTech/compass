import { type ObjectId } from "mongodb";
import { z } from "zod/v4";
import { zObjectId } from "@core/types/type.utils";
import dayjs from "@core/util/date/dayjs";
import {
  type BookingReservationRecord,
  BookingReservationRecordSchema,
} from "@backend/booking/booking-reservation.record";
import mongoService from "@backend/common/services/mongo.service";

// Projected reads must not use the strict record schema: a projection drops
// fields the strict parse requires, so it would throw on every stored row.
const ConfirmedSlotRowSchema = z.object({
  _id: zObjectId,
  slotStart: z.date(),
});

/**
 * Half-open [from, to) of `slotStart` values the slot engine can still see.
 *
 * Buffer collision uses the reservation interval expanded by `bufferMinutes`
 * on each side, so a start `duration+buffer` before the window (or after it)
 * can still block a candidate. `maxBookingsPerDay` counts every confirmed
 * start on each local day that has a candidate, so the range also covers
 * those local days in full.
 */
export const confirmedReservationScanRange = (
  page: {
    bufferMinutes: number | null;
    durationMinutes: number;
    timeZone: string;
  },
  windowStart: Date,
  windowEnd: Date,
): { from: Date; to: Date } => {
  const bufferMs = (page.bufferMinutes ?? 0) * 60_000;
  const durationMs = page.durationMinutes * 60_000;
  const fromByBuffer = new Date(windowStart.getTime() - durationMs - bufferMs);
  const toByBuffer = new Date(windowEnd.getTime() + durationMs + bufferMs);
  const fromByDay = dayjs(windowStart)
    .tz(page.timeZone)
    .startOf("day")
    .toDate();
  const toByDay = dayjs(windowEnd)
    .tz(page.timeZone)
    .add(1, "day")
    .startOf("day")
    .toDate();
  return {
    from: new Date(Math.min(fromByBuffer.getTime(), fromByDay.getTime())),
    to: new Date(Math.max(toByBuffer.getTime(), toByDay.getTime())),
  };
};

export type InsertBookingReservationInput = Omit<
  BookingReservationRecord,
  "createdAt" | "updatedAt"
> & { _id: ObjectId };

class BookingReservationRepository {
  async findById(id: ObjectId): Promise<BookingReservationRecord | null> {
    const record = await mongoService.bookingReservation.findOne({ _id: id });
    if (!record) return null;
    return BookingReservationRecordSchema.parse(record);
  }

  async listConfirmedStartsByPageId(
    pageId: ObjectId,
    range: { from: Date; to: Date },
  ): Promise<Date[]> {
    const rows = await mongoService.bookingReservation
      .find({
        pageId,
        status: "confirmed",
        slotStart: { $gte: range.from, $lt: range.to },
      })
      .project({ slotStart: 1 })
      .toArray();
    return rows.map((row) => ConfirmedSlotRowSchema.parse(row).slotStart);
  }

  async listConfirmedOverlapping(
    pageId: ObjectId,
    slotStart: Date,
    slotEnd: Date,
  ): Promise<ObjectId[]> {
    const rows = await mongoService.bookingReservation
      .find({
        pageId,
        status: "confirmed",
        slotStart: { $lt: slotEnd },
        slotEnd: { $gt: slotStart },
      })
      .project({ slotStart: 1 })
      .toArray();
    return rows.map((row) => ConfirmedSlotRowSchema.parse(row)._id);
  }

  async deleteById(id: ObjectId): Promise<void> {
    await mongoService.bookingReservation.deleteOne({ _id: id });
  }

  async insert(
    input: InsertBookingReservationInput,
  ): Promise<BookingReservationRecord> {
    const now = new Date();
    const record: BookingReservationRecord =
      BookingReservationRecordSchema.parse({
        ...input,
        createdAt: now,
        updatedAt: now,
      });
    await mongoService.bookingReservation.insertOne(record);
    return record;
  }

  async markCancelled(id: ObjectId): Promise<BookingReservationRecord | null> {
    const now = new Date();
    const result = await mongoService.bookingReservation.findOneAndUpdate(
      { _id: id, status: "confirmed" },
      { $set: { status: "cancelled", updatedAt: now } },
      { returnDocument: "after" },
    );
    if (!result) return null;
    return BookingReservationRecordSchema.parse(result);
  }

  async updateGuestDetails(
    id: ObjectId,
    details: { guestName: string; notes: string | null },
  ): Promise<BookingReservationRecord | null> {
    const now = new Date();
    const result = await mongoService.bookingReservation.findOneAndUpdate(
      { _id: id, status: "confirmed" },
      {
        $set: {
          guestName: details.guestName,
          notes: details.notes,
          updatedAt: now,
        },
      },
      { returnDocument: "after" },
    );
    if (!result) return null;
    return BookingReservationRecordSchema.parse(result);
  }
}

export const bookingReservationRepository = new BookingReservationRepository();
