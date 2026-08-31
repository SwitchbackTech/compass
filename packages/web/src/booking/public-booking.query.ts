import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";
import {
  type CreateBookingReservationInput,
  type CreateBookingReservationResponse,
} from "@core/types/booking.contracts";
import {
  PublicBookingApi,
  PublicBookingNotFoundError,
} from "@web/api/public-booking.api";
import { getErrorStatus } from "@web/api/util/api.util";
import { getPublicBookingSlotWindow } from "@web/booking/public-booking.format";

export const publicBookingQueryKeys = {
  page: (slug: string) => ["public-booking", "page", slug] as const,
  slots: (slug: string, start: string, end: string, timeZone: string) =>
    ["public-booking", "slots", slug, start, end, timeZone] as const,
};

export function publicBookingPageQueryOptions(slug: string) {
  return queryOptions({
    queryKey: publicBookingQueryKeys.page(slug),
    queryFn: () => PublicBookingApi.getPage(slug),
    retry: (failureCount, error) => {
      if (error instanceof PublicBookingNotFoundError) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

export function usePublicBookingPageQuery(slug: string) {
  return useQuery(publicBookingPageQueryOptions(slug));
}

export function usePublicBookingSlotsQuery(
  slug: string,
  enabled: boolean,
  maxHorizonDays: number | undefined,
) {
  // Query stays disabled until maxHorizonDays is known; 60 only fills the key.
  const window = useMemo(
    () => getPublicBookingSlotWindow("UTC", maxHorizonDays ?? 60),
    [maxHorizonDays],
  );
  return useQuery({
    queryKey: publicBookingQueryKeys.slots(
      slug,
      window.start,
      window.end,
      window.timeZone,
    ),
    queryFn: () => PublicBookingApi.getSlots(slug, window),
    enabled: enabled && Boolean(slug) && maxHorizonDays != null,
  });
}

export function useCreatePublicBookingReservationMutation(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBookingReservationInput) =>
      PublicBookingApi.createReservation(slug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["public-booking", "slots", slug],
      });
    },
  });
}

export function isPublicBookingConflictError(error: unknown): boolean {
  return getErrorStatus(error) === 409;
}

export type PublicBookingConfirmation = CreateBookingReservationResponse;
