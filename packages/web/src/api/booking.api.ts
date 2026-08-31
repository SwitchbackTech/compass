import {
  type AdminGetBookingPageResponse,
  AdminGetBookingPageResponseSchema,
  type AdminGetBookingPageResult,
  AdminGetBookingPageSetupResponseSchema,
  type AdminPutBookingPageInput,
} from "@core/types/booking.contracts";
import { BaseApi } from "@web/api/base/base.api";

const isAdminGetBookingPageResponse = (
  page: unknown,
): page is AdminGetBookingPageResponse =>
  typeof page === "object" && page !== null && "bookingUrl" in page;

const BookingApi = {
  async getPage(): Promise<AdminGetBookingPageResult> {
    const response = await BaseApi.get<unknown>(`/booking/page`);
    if (isAdminGetBookingPageResponse(response.data)) {
      return AdminGetBookingPageResponseSchema.parse(response.data);
    }
    return AdminGetBookingPageSetupResponseSchema.parse(response.data);
  },

  async putPage(
    input: AdminPutBookingPageInput,
  ): Promise<AdminGetBookingPageResult> {
    const response = await BaseApi.put<unknown>(`/booking/page`, input);
    if (isAdminGetBookingPageResponse(response.data)) {
      return AdminGetBookingPageResponseSchema.parse(response.data);
    }
    return AdminGetBookingPageSetupResponseSchema.parse(response.data);
  },
};

export { BookingApi };
