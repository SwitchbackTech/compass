import {
  type BookingSlotsQuery,
  BookingSlotsQuerySchema,
  type BookingSlotsResponse,
  BookingSlotsResponseSchema,
  type CancelBookingReservationInput,
  CancelBookingReservationInputSchema,
  type CreateBookingReservationInput,
  CreateBookingReservationInputSchema,
  type CreateBookingReservationResponse,
  CreateBookingReservationResponseSchema,
  type PublicGetBookingPageResponse,
  PublicGetBookingPageResponseSchema,
  type PublicGetBookingReservationResponse,
  PublicGetBookingReservationResponseSchema,
} from "@core/types/booking.contracts";
import { BaseApi } from "@web/api/base/base.api";
import { getErrorStatus } from "@web/api/util/api.util";

export class PublicBookingNotFoundError extends Error {
  constructor() {
    super("Booking page not found");
    this.name = "PublicBookingNotFoundError";
  }
}

const PublicBookingApi = {
  async getPage(slug: string): Promise<PublicGetBookingPageResponse> {
    try {
      const response = await BaseApi.get<unknown>(
        `/booking/pages/${encodeURIComponent(slug)}`,
        { skipSessionRecovery: true },
      );
      return PublicGetBookingPageResponseSchema.parse(response.data);
    } catch (error) {
      if (getErrorStatus(error) === 404) {
        throw new PublicBookingNotFoundError();
      }
      throw error;
    }
  },

  async getSlots(
    slug: string,
    query: BookingSlotsQuery,
    signal?: AbortSignal,
  ): Promise<BookingSlotsResponse> {
    const parsed = BookingSlotsQuerySchema.parse(query);
    const params = new URLSearchParams({
      start: parsed.start,
      end: parsed.end,
      timeZone: parsed.timeZone,
    });
    const response = await BaseApi.get<unknown>(
      `/booking/pages/${encodeURIComponent(slug)}/slots?${params.toString()}`,
      { skipSessionRecovery: true, signal },
    );
    return BookingSlotsResponseSchema.parse(response.data);
  },

  async createReservation(
    slug: string,
    input: CreateBookingReservationInput,
  ): Promise<CreateBookingReservationResponse> {
    const parsed = CreateBookingReservationInputSchema.parse(input);
    const response = await BaseApi.post<unknown>(
      `/booking/pages/${encodeURIComponent(slug)}/reservations`,
      parsed,
      { skipSessionRecovery: true },
    );
    return CreateBookingReservationResponseSchema.parse(response.data);
  },

  async getReservation(
    reservationId: string,
  ): Promise<PublicGetBookingReservationResponse> {
    try {
      const response = await BaseApi.get<unknown>(
        `/booking/reservations/${encodeURIComponent(reservationId)}`,
        { skipSessionRecovery: true },
      );
      return PublicGetBookingReservationResponseSchema.parse(response.data);
    } catch (error) {
      if (getErrorStatus(error) === 404) {
        throw new PublicBookingNotFoundError();
      }
      throw error;
    }
  },

  async cancelReservation(
    reservationId: string,
    input: CancelBookingReservationInput,
  ): Promise<void> {
    const parsed = CancelBookingReservationInputSchema.parse(input);
    await BaseApi.post<unknown>(
      `/booking/reservations/${encodeURIComponent(reservationId)}/cancel`,
      parsed,
      { skipSessionRecovery: true },
    );
  },
};

export { PublicBookingApi };
