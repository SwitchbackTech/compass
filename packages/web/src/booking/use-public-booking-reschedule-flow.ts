import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { RescheduleBookingReservationInputSchema } from "@core/types/booking.contracts";
import dayjs from "@core/util/date/dayjs";
import { PublicBookingNotFoundError } from "@web/api/public-booking.api";
import { getErrorStatus } from "@web/api/util/api.util";
import {
  formatBookingDateKey,
  formatBookingMonthKey,
  listBookingAvailableDateKeysInMonth,
} from "@web/booking/public-booking.format";
import {
  isPublicBookingConflictError,
  prefetchPublicBookingReservationMonth,
  resolveNextAvailableReservationDate,
  usePrefetchAdjacentReservationMonths,
  usePublicBookingPageQuery,
  usePublicBookingReservationQuery,
  usePublicBookingReservationSlotsQuery,
  useReschedulePublicBookingReservationMutation,
} from "@web/booking/public-booking.query";
import {
  type PublicBookingRescheduleSearch,
  publicCancelUrlForReservation,
  publicRescheduleUrlForReservation,
} from "@web/booking/public-booking-search";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { isHigherEscapeOwner } from "@web/shortcuts/escape-ownership";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";
import { getBrowserTimeZone } from "@web/timezone/browser-timezone";

const SLOT_CONFLICT_ALERT =
  "This time is no longer available. Pick another slot.";

export function usePublicBookingRescheduleFlow() {
  const { reservationId } = useParams({
    from: "/book/reschedule/$reservationId",
  });
  const search: PublicBookingRescheduleSearch = useSearch({
    from: "/book/reschedule/$reservationId",
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = search.token ?? "";
  const canLoad = Boolean(reservationId && token);

  const reservationQuery = usePublicBookingReservationQuery(
    canLoad ? reservationId : "",
  );
  const bookingSlug =
    reservationQuery.data?.status === "confirmed"
      ? (reservationQuery.data.bookingSlug ?? "")
      : "";
  const pageQuery = usePublicBookingPageQuery(bookingSlug);

  const browserTimeZone = useMemo(getBrowserTimeZone, []);
  const guestTimeZone = search.tz ?? browserTimeZone;
  const selectedSlotStart = search.slot ?? null;
  const slotDateKey = selectedSlotStart
    ? formatBookingDateKey(selectedSlotStart, guestTimeZone)
    : null;
  const monthKey =
    search.month ??
    slotDateKey?.slice(0, 7) ??
    formatBookingMonthKey(dayjs(), guestTimeZone);

  const slotsQuery = usePublicBookingReservationSlotsQuery(
    canLoad && reservationQuery.data?.status === "confirmed"
      ? reservationId
      : "",
    token,
    monthKey,
    pageQuery.data?.maxHorizonDays,
    guestTimeZone,
  );
  const rescheduleReservation =
    useReschedulePublicBookingReservationMutation(reservationId);

  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);
  const pickerHeadingRef = useRef<HTMLHeadingElement>(null);
  const submitInFlightRef = useRef(false);
  const pendingPickerFocusRef = useRef(false);

  useEffect(() => {
    if (alertMessage) {
      alertRef.current?.focus();
    }
  }, [alertMessage]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: jump remounts the picker heading
  useEffect(() => {
    if (pendingPickerFocusRef.current) {
      pendingPickerFocusRef.current = false;
      pickerHeadingRef.current?.focus();
    }
  }, [monthKey, search.date]);

  usePrefetchAdjacentReservationMonths(
    reservationId,
    token,
    monthKey,
    guestTimeZone,
    pageQuery.data?.maxHorizonDays,
    canLoad &&
      pageQuery.isSuccess &&
      pageQuery.data.enabled &&
      slotsQuery.isSuccess,
  );

  const todayKey = formatBookingDateKey(dayjs(), guestTimeZone);
  const availableDateKeys = useMemo(
    () =>
      slotsQuery.data?.bookable
        ? listBookingAvailableDateKeysInMonth(
            slotsQuery.data.slots,
            monthKey,
            guestTimeZone,
            todayKey,
          )
        : [],
    [guestTimeZone, monthKey, slotsQuery.data, todayKey],
  );

  const selectedDateKey =
    (search.date?.startsWith(monthKey) ? search.date : null) ??
    (slotDateKey?.startsWith(monthKey) ? slotDateKey : null) ??
    availableDateKeys[0] ??
    null;

  const slotsHasData = Boolean(slotsQuery.data);
  const slotsFetching =
    !slotsHasData && (slotsQuery.isPending || slotsQuery.isFetching);
  const slotsError = Boolean(slotsQuery.isError && !slotsHasData);
  const slotsPending = slotsFetching && !slotsError;

  const updateSearch = (
    patch: Partial<PublicBookingRescheduleSearch>,
    { push = false }: { push?: boolean } = {},
  ) => {
    void navigate({
      to: ".",
      search: (previous: PublicBookingRescheduleSearch) => ({
        ...previous,
        ...patch,
      }),
      replace: !push,
    });
  };

  const handleSelectSlot = (slotStart: string) => {
    setAlertMessage(null);
    updateSearch(
      { slot: slotStart, date: formatBookingDateKey(slotStart, guestTimeZone) },
      { push: true },
    );
  };

  const handleSelectDay = (dateKey: string) => {
    updateSearch({
      date: dateKey,
      slot: slotDateKey !== dateKey ? undefined : search.slot,
    });
  };

  const handleMonthChange = (nextMonthKey: string) => {
    setAlertMessage(null);
    updateSearch({ month: nextMonthKey, date: undefined, slot: undefined });
  };

  const handleTimeZoneChange = (nextTimeZone: string) => {
    if (nextTimeZone === guestTimeZone) {
      return;
    }
    if (selectedSlotStart) {
      updateSearch({ tz: nextTimeZone, month: undefined, date: undefined });
      return;
    }
    const currentMonthInOldZone = formatBookingMonthKey(dayjs(), guestTimeZone);
    updateSearch({
      tz: nextTimeZone,
      date: undefined,
      month: monthKey === currentMonthInOldZone ? undefined : search.month,
    });
  };

  useAppShortcut(
    "Escape",
    (event) => {
      if (isHigherEscapeOwner()) {
        return;
      }
      if (submitInFlightRef.current || !reservationId) {
        return;
      }
      event.preventDefault();
      void navigate({
        to: ROOT_ROUTES.BOOK_CONFIRMED,
        params: { reservationId },
        search: token ? { token } : undefined,
      });
    },
    {
      enabled: canLoad && !rescheduleReservation.isPending,
      ignoreInputs: false,
    },
  );

  const handlePrefetchMonth = (nextMonthKey: string) => {
    if (!pageQuery.data || !token) {
      return;
    }
    void prefetchPublicBookingReservationMonth(
      queryClient,
      reservationId,
      token,
      nextMonthKey,
      guestTimeZone,
      pageQuery.data.maxHorizonDays,
    );
  };

  const handleJumpToNextAvailable = async () => {
    if (!pageQuery.data || !token) {
      return;
    }
    const next = await resolveNextAvailableReservationDate(
      queryClient,
      reservationId,
      token,
      monthKey,
      selectedDateKey,
      guestTimeZone,
      todayKey,
      pageQuery.data.maxHorizonDays,
    );
    if (next) {
      pendingPickerFocusRef.current = true;
      setAlertMessage(null);
      updateSearch({
        month: next.monthKey,
        date: next.dateKey,
        slot: undefined,
      });
      return;
    }
    setAlertMessage(
      `No open times in the next ${pageQuery.data.maxHorizonDays} days. Check back later.`,
    );
  };

  const handleConfirm = async () => {
    if (
      !selectedSlotStart ||
      !token ||
      !pageQuery.data ||
      submitInFlightRef.current
    ) {
      return;
    }

    submitInFlightRef.current = true;
    setAlertMessage(null);

    try {
      await rescheduleReservation.mutateAsync(
        RescheduleBookingReservationInputSchema.parse({
          token,
          slotStart: selectedSlotStart,
          guestTimeZone,
          durationMinutes: pageQuery.data.durationMinutes,
        }),
      );
      await navigate({
        to: ROOT_ROUTES.BOOK_CONFIRMED,
        params: { reservationId },
        search: { token },
        state: {
          cancelUrl: publicCancelUrlForReservation(
            reservationId,
            token,
            window.location.origin,
          ),
          rescheduleUrl: publicRescheduleUrlForReservation(
            reservationId,
            token,
            window.location.origin,
          ),
        } as never,
      });
    } catch (error) {
      if (isPublicBookingConflictError(error)) {
        setAlertMessage(SLOT_CONFLICT_ALERT);
        updateSearch({ slot: undefined });
        await slotsQuery.refetch();
        return;
      }
      if (
        error instanceof PublicBookingNotFoundError ||
        getErrorStatus(error) === 404
      ) {
        setAlertMessage("This booking is no longer available.");
        await reservationQuery.refetch();
        return;
      }
      setAlertMessage("Could not reschedule this booking. Please try again.");
    } finally {
      submitInFlightRef.current = false;
    }
  };

  return {
    canLoad,
    token,
    reservationQuery,
    pageQuery,
    slotsQuery,
    rescheduleReservation,
    guestTimeZone,
    monthKey,
    selectedSlotStart,
    selectedDateKey,
    alertMessage,
    slotsPending,
    slotsError,
    slotsFetching,
    alertRef,
    pickerHeadingRef,
    handleSelectSlot,
    handleSelectDay,
    handleMonthChange,
    handleTimeZoneChange,
    handlePrefetchMonth,
    handleJumpToNextAvailable,
    handleConfirm,
  };
}
