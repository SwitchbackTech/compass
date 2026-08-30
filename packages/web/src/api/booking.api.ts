import {
  type AdminGetBookingPageResponse,
  AdminGetBookingPageResponseSchema,
  type AdminPutBookingPageInput,
  AdminPutBookingPageInputSchema,
} from "@core/types/booking.contracts";
import { BaseApi } from "@web/api/base/base.api";

export type HostBookingPageResponse =
  | AdminPutBookingPageInput
  | AdminGetBookingPageResponse;

const isAdminGetBookingPageResponse = (
  page: HostBookingPageResponse,
): page is AdminGetBookingPageResponse => "bookingUrl" in page;

const BookingApi = {
  async getPage(): Promise<HostBookingPageResponse> {
    const response = await BaseApi.get<unknown>(`/booking/page`);
    if (
      isAdminGetBookingPageResponse(response.data as HostBookingPageResponse)
    ) {
      return AdminGetBookingPageResponseSchema.parse(response.data);
    }
    return AdminPutBookingPageInputSchema.parse(response.data);
  },

  async putPage(
    input: AdminPutBookingPageInput,
  ): Promise<HostBookingPageResponse> {
    const response = await BaseApi.put<unknown>(`/booking/page`, input);
    if (
      isAdminGetBookingPageResponse(response.data as HostBookingPageResponse)
    ) {
      return AdminGetBookingPageResponseSchema.parse(response.data);
    }
    return AdminPutBookingPageInputSchema.parse(response.data);
  },
};

export { BookingApi };
