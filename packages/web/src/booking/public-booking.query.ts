import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import {
  type CreateBookingReservationInput,
  type CreateBookingReservationResponse,
} from "@core/types/booking.contracts";
import {
  PublicBookingApi,
  PublicBookingNotFoundError,
} from "@web/api/public-booking.api";
import { getErrorStatus } from "@web/api/util/api.util";
import {
  getPublicBookingMonthWindow,
  shiftBookingMonthKey,
} from "@web/booking/public-booking.format";
import { getBrowserTimeZone } from "@web/timezone/browser-timezone";

export const PUBLIC_BOOKING_PAGE_STALE_TIME_MS = 5 * 60 * 1000;
export const PUBLIC_BOOKING_SLOTS_STALE_TIME_MS = 60_000;

export const publicBookingQueryKeys = {
  page: (slug: string) => ["public-booking", "page", slug] as const,
  slots: (slug: string, monthKey: string, timeZone: string) =>
    ["public-booking", "slots", slug, monthKey, timeZone] as const,
};

export function publicBookingPageQueryOptions(slug: string) {
  return queryOptions({
    queryKey: publicBookingQueryKeys.page(slug),
    queryFn: () => PublicBookingApi.getPage(slug),
    staleTime: PUBLIC_BOOKING_PAGE_STALE_TIME_MS,
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

export function publicBookingSlotsQueryOptions(
  slug: string,
  monthKey: string,
  timeZone: string,
  maxHorizonDays: number,
) {
  return queryOptions({
    queryKey: publicBookingQueryKeys.slots(slug, monthKey, timeZone),
    queryFn: ({ signal }) => {
      const window = getPublicBookingMonthWindow(
        monthKey,
        timeZone,
        maxHorizonDays,
      );
      if (!window) {
        return { slots: [], bookable: true as const };
      }
      return PublicBookingApi.getSlots(slug, window, signal);
    },
    staleTime: PUBLIC_BOOKING_SLOTS_STALE_TIME_MS,
    retry: false,
  });
}

export function usePublicBookingSlotsQuery(
  slug: string,
  monthKey: string,
  maxHorizonDays: number | undefined,
) {
  const timeZone = getBrowserTimeZone();
  // Start the first month in parallel with page meta. 60 is the schema max
  // and only used until `maxHorizonDays` is known; the query key is the month
  // so landing page meta does not refetch. The backend still clamps to the
  // host horizon. Adjacent prefetch waits for the real horizon.
  const horizon = maxHorizonDays ?? 60;
  const window = useMemo(
    () => getPublicBookingMonthWindow(monthKey, timeZone, horizon),
    [monthKey, timeZone, horizon],
  );

  return useQuery({
    ...publicBookingSlotsQueryOptions(slug, monthKey, timeZone, horizon),
    enabled: Boolean(slug) && window != null,
  });
}

export function prefetchPublicBookingMonth(
  queryClient: ReturnType<typeof useQueryClient>,
  slug: string,
  monthKey: string,
  timeZone: string,
  maxHorizonDays: number,
) {
  const window = getPublicBookingMonthWindow(
    monthKey,
    timeZone,
    maxHorizonDays,
  );
  if (!window || !slug) {
    return;
  }
  return queryClient.prefetchQuery(
    publicBookingSlotsQueryOptions(slug, monthKey, timeZone, maxHorizonDays),
  );
}

export function usePrefetchAdjacentBookingMonths(
  slug: string,
  monthKey: string,
  timeZone: string,
  maxHorizonDays: number | undefined,
  enabled: boolean,
) {
  const queryClient = useQueryClient();
  const previousMonthKey = shiftBookingMonthKey(monthKey, -1, timeZone);
  const nextMonthKey = shiftBookingMonthKey(monthKey, 1, timeZone);

  useEffect(() => {
    if (!enabled || maxHorizonDays == null || !slug) {
      return;
    }
    void prefetchPublicBookingMonth(
      queryClient,
      slug,
      previousMonthKey,
      timeZone,
      maxHorizonDays,
    );
    void prefetchPublicBookingMonth(
      queryClient,
      slug,
      nextMonthKey,
      timeZone,
      maxHorizonDays,
    );
  }, [
    enabled,
    maxHorizonDays,
    nextMonthKey,
    previousMonthKey,
    queryClient,
    slug,
    timeZone,
  ]);
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
