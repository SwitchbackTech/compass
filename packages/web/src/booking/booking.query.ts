import {
  type QueryClient,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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

function handleBookingSaveError(
  error: unknown,
  queryClient: QueryClient,
): void {
  if (isApiError(error)) {
    const code = getApiErrorCode(error);
    if (code === "BILLING_REQUIRED") {
      billingPreviewActions.exit();
      void queryClient.invalidateQueries({
        queryKey: billingQueryKeys.status,
      });
      return;
    }
    if (error.message) {
      showErrorToast(error.message);
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
