import { type ObjectId } from "mongodb";
import { z } from "zod/v4";
import { zObjectId } from "@core/types/type.utils";
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

  async listConfirmedStartsByPageId(pageId: ObjectId): Promise<Date[]> {
    const rows = await mongoService.bookingReservation
      .find({ pageId, status: "confirmed" })
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
