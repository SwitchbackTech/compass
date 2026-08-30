import { type ObjectId } from "mongodb";
import {
  type BookingReservationRecord,
  BookingReservationRecordSchema,
} from "@backend/booking/booking-reservation.record";
import mongoService from "@backend/common/services/mongo.service";

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
    return rows.map(
      (row) => BookingReservationRecordSchema.parse(row).slotStart,
    );
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
}

export const bookingReservationRepository = new BookingReservationRepository();
