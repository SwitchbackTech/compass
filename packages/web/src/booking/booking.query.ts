import {
  type QueryClient,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ZodError } from "zod/v4";
import {
  type AdminPutBookingPageInput,
  AdminPutBookingPageInputSchema,
} from "@core/types/booking.contracts";
import { BookingApi } from "@web/api/booking.api";
import { getApiErrorCode, isApiError } from "@web/api/util/api.util";
import { billingQueryKeys } from "@web/billing/billing.query";
import { billingPreviewActions } from "@web/billing/billing-preview.store";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";

export const bookingQueryKeys = {
  page: ["booking", "page"] as const,
};

export function bookingPageQueryOptions() {
  return queryOptions({
    queryKey: bookingQueryKeys.page,
    queryFn: () => BookingApi.getPage(),
    staleTime: 30_000,
  });
}

export function useBookingPageQuery(enabled: boolean) {
  return useQuery({
    ...bookingPageQueryOptions(),
    enabled,
  });
}

const BOOKING_SAVE_ERROR_COPY: Record<string, string> = {
  BLOCKING_CALENDAR_INVALID:
    "One of your blocking calendars can't be checked for busy times. Uncheck it and save again.",
  DESTINATION_NOT_WRITABLE:
    "The destination calendar can't accept new events. Choose a different calendar and save again.",
  TIMEZONE_REQUIRED: "Choose a booking timezone before enabling booking.",
  INVALID_INPUT:
    "Some settings couldn't be saved. Check the highlighted fields and try again.",
};

function handleBookingSaveError(
  error: unknown,
  queryClient: QueryClient,
): void {
  if (error instanceof ZodError) {
    // A client-side schema rejection means a form field slipped past its
    // inline validation - point at the fields, not at the server.
    showErrorToast("Check the booking fields and try again.");
    return;
  }
  if (isApiError(error)) {
    const code = getApiErrorCode(error);
    if (code === "BILLING_REQUIRED") {
      billingPreviewActions.exit();
      void queryClient.invalidateQueries({
        queryKey: billingQueryKeys.status,
      });
      return;
    }
    const copy = code ? BOOKING_SAVE_ERROR_COPY[code] : undefined;
    if (copy) {
      showErrorToast(copy);
      return;
    }
  }
  showErrorToast("Could not save booking settings. Please try again.");
}

export function useSaveBookingPageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminPutBookingPageInput) => {
      const parsed = AdminPutBookingPageInputSchema.parse(input);
      return BookingApi.putPage(parsed);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(bookingQueryKeys.page, data);
    },
    onError: (error) => handleBookingSaveError(error, queryClient),
  });
}
