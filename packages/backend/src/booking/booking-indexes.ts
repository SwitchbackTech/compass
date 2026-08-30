import mongoService from "@backend/common/services/mongo.service";

export async function ensureBookingIndexes(): Promise<void> {
  await mongoService.bookingPage.createIndex(
    { userId: 1 },
    { name: "booking_page_user_id_unique", unique: true },
  );
  await mongoService.bookingPage.createIndex(
    { bookingSlug: 1 },
    {
      name: "booking_page_slug_unique",
      unique: true,
      sparse: true,
    },
  );

  await mongoService.bookingReservation.createIndex(
    { pageId: 1, slotStart: 1 },
    { name: "booking_reservation_page_slot" },
  );
  await mongoService.bookingReservation.createIndex(
    { pageId: 1, status: 1, slotStart: 1 },
    { name: "booking_reservation_page_status_slot" },
  );
}
