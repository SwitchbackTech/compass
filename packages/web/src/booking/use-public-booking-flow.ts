import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { CreateBookingReservationInputSchema } from "@core/types/booking.contracts";
import dayjs from "@core/util/date/dayjs";
import { getErrorStatus } from "@web/api/util/api.util";
import { track } from "@web/auth/posthog/track";
import {
  type PublicBookingGuestDetails,
  type PublicBookingGuestFormValues,
} from "@web/booking/PublicBookingGuestForm";
import {
  formatBookingDateKey,
  formatBookingMonthKey,
  listBookingAvailableDateKeysInMonth,
} from "@web/booking/public-booking.format";
import {
  isPublicBookingConflictError,
  prefetchPublicBookingMonth,
  resolveNextAvailableBookingDate,
  useCreatePublicBookingReservationMutation,
  usePrefetchAdjacentBookingMonths,
  usePublicBookingPageQuery,
  usePublicBookingSlotsQuery,
} from "@web/booking/public-booking.query";
import {
  type PublicBookingSearch,
  tokenFromGuestActionUrl,
} from "@web/booking/public-booking-search";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { isHigherEscapeOwner } from "@web/shortcuts/escape-ownership";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";
import { getBrowserTimeZone } from "@web/timezone/browser-timezone";

const EMPTY_GUEST_DETAILS: PublicBookingGuestDetails = {
  guestName: "",
  guestEmail: "",
  notes: "",
};

const SLOT_CONFLICT_ALERT =
  "This time is no longer available. Pick another slot.";

/**
 * All state and behavior of the guest booking flow. The URL is the source of
 * truth for the selection (month, day, slot, timezone): Back returns from the
 * details step to the picker instead of leaving the site, refresh keeps the
 * selection, and the link is shareable. The page component only renders.
 */
export function usePublicBookingFlow() {
  const { username } = useParams({ from: "/book/$username" });
  const slug = username ?? "";
  const navigate = useNavigate();
  const search: PublicBookingSearch = useSearch({ from: "/book/$username" });
  const queryClient = useQueryClient();

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

  const pageQuery = usePublicBookingPageQuery(slug);
  const slotsQuery = usePublicBookingSlotsQuery(
    slug,
    monthKey,
    pageQuery.data?.maxHorizonDays,
    guestTimeZone,
  );
  const createReservation = useCreatePublicBookingReservationMutation(slug);

  const [guestDetails, setGuestDetails] =
    useState<PublicBookingGuestDetails>(EMPTY_GUEST_DETAILS);
  // "Change time" shows the picker with the chosen slot still highlighted, so
  // the slot stays in the URL and only this local flag flips the view.
  const [changingTime, setChangingTime] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);
  const detailsHeadingRef = useRef<HTMLHeadingElement>(null);
  const pickerHeadingRef = useRef<HTMLHeadingElement>(null);
  const submitInFlightRef = useRef(false);
  const pendingPickerFocusRef = useRef(false);

  const showDetailsStep = selectedSlotStart !== null && !changingTime;

  useEffect(() => {
    if (alertMessage) {
      alertRef.current?.focus();
    }
  }, [alertMessage]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: jump remounts the picker heading
  useEffect(() => {
    if (showDetailsStep) {
      detailsHeadingRef.current?.focus();
      return;
    }
    if (pendingPickerFocusRef.current) {
      pendingPickerFocusRef.current = false;
      pickerHeadingRef.current?.focus();
    }
  }, [monthKey, search.date, showDetailsStep]);

  usePrefetchAdjacentBookingMonths(
    slug,
    monthKey,
    guestTimeZone,
    pageQuery.data?.maxHorizonDays,
    pageQuery.isSuccess && pageQuery.data.enabled && slotsQuery.isSuccess,
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

  // The guest's explicit day pick wins while it is in the month in view (even
  // when it has no open times); otherwise the picked slot's day, otherwise the
  // first day with open times.
  const selectedDateKey =
    (search.date?.startsWith(monthKey) ? search.date : null) ??
    (slotDateKey?.startsWith(monthKey) ? slotDateKey : null) ??
    availableDateKeys[0] ??
    null;

  // 409 only: keep typed details while they pick another slot. Other alerts
  // (empty horizon, confirm failure) must not open the guest form.
  const showConflictForm =
    !showDetailsStep && alertMessage === SLOT_CONFLICT_ALERT;
  const slotsHasData = Boolean(slotsQuery.data);
  const slotsFetching =
    !slotsHasData && (slotsQuery.isPending || slotsQuery.isFetching);
  const slotsError = Boolean(slotsQuery.isError && !slotsHasData);
  const slotsPending = slotsFetching && !slotsError;

  const updateSearch = (
    patch: Partial<PublicBookingSearch>,
    { push = false }: { push?: boolean } = {},
  ) => {
    void navigate({
      to: ".",
      search: (previous: PublicBookingSearch) => ({ ...previous, ...patch }),
      replace: !push,
    });
  };

  const handleSelectSlot = (slotStart: string) => {
    setAlertMessage(null);
    setChangingTime(false);
    // Push, not replace: Back from the details step returns to the picker.
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
    setChangingTime(false);
    updateSearch({ month: nextMonthKey, date: undefined, slot: undefined });
  };

  const handleTimeZoneChange = (nextTimeZone: string) => {
    if (nextTimeZone === guestTimeZone) {
      return;
    }
    if (selectedSlotStart) {
      // Keep the slot; its day and month re-derive in the new zone.
      updateSearch({ tz: nextTimeZone, month: undefined, date: undefined });
      return;
    }
    const currentMonthInOldZone = formatBookingMonthKey(dayjs(), guestTimeZone);
    updateSearch({
      tz: nextTimeZone,
      date: undefined,
      // Re-snap to "this month" in the new zone; keep an explicitly browsed
      // month as-is.
      month: monthKey === currentMonthInOldZone ? undefined : search.month,
    });
  };

  const handleChangeTime = () => {
    pendingPickerFocusRef.current = true;
    setChangingTime(true);
  };

  // Escape on Your details is the keyboard equivalent of Change time.
  // OverlayPanel (timezone) holds the app lock, so ignoreAppLock stays false.
  // Slot-list Escape is owned by PublicBookingSlotPicker, not this shortcut.
  useAppShortcut(
    "Escape",
    (event) => {
      if (isHigherEscapeOwner()) {
        return;
      }
      event.preventDefault();
      handleChangeTime();
    },
    { enabled: showDetailsStep, ignoreInputs: false },
  );

  const handlePrefetchMonth = (nextMonthKey: string) => {
    if (!pageQuery.data) {
      return;
    }
    void prefetchPublicBookingMonth(
      queryClient,
      slug,
      nextMonthKey,
      guestTimeZone,
      pageQuery.data.maxHorizonDays,
    );
  };

  const handleJumpToNextAvailable = async () => {
    if (!pageQuery.data) {
      return;
    }
    const next = await resolveNextAvailableBookingDate(
      queryClient,
      slug,
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
    // Every month up to the horizon came back empty - say so instead of
    // silently doing nothing.
    setAlertMessage(
      `No open times in the next ${pageQuery.data.maxHorizonDays} days. Check back later.`,
    );
  };

  const handleSubmit = async (values: PublicBookingGuestFormValues) => {
    if (!selectedSlotStart || !pageQuery.data || submitInFlightRef.current) {
      return;
    }

    submitInFlightRef.current = true;
    setAlertMessage(null);

    try {
      const result = await createReservation.mutateAsync(
        CreateBookingReservationInputSchema.parse({
          slotStart: selectedSlotStart,
          guestName: values.guestName,
          guestEmail: values.guestEmail,
          notes: values.notes || undefined,
          guestTimeZone: values.guestTimeZone,
          durationMinutes: pageQuery.data.durationMinutes,
        }),
      );
      track("booking_reservation_created", {
        duration_minutes: pageQuery.data.durationMinutes,
      });
      const token = tokenFromGuestActionUrl(result.cancelUrl);
      await navigate({
        to: ROOT_ROUTES.BOOK_CONFIRMED,
        params: { reservationId: result.reservationId },
        search: token ? { token } : undefined,
        // History state still carries the absolute cancel and reschedule URLs
        // from confirm. The permalink also writes `?token=` so a reload or
        // bookmark keeps guest actions and edit without publishing the token
        // on the public GET.
        state: {
          cancelUrl: result.cancelUrl,
          rescheduleUrl: result.rescheduleUrl,
        } as never,
      });
    } catch (error) {
      if (isPublicBookingConflictError(error)) {
        setAlertMessage(SLOT_CONFLICT_ALERT);
        setChangingTime(false);
        updateSearch({ slot: undefined });
        await slotsQuery.refetch();
        return;
      }
      if (getErrorStatus(error) === 404) {
        // The host disabled the page mid-flow; the refetch flips the whole
        // page to its not-found state.
        setAlertMessage("This booking page is no longer available.");
        await pageQuery.refetch();
        return;
      }
      setAlertMessage("Could not confirm this booking. Please try again.");
    } finally {
      submitInFlightRef.current = false;
    }
  };

  return {
    pageQuery,
    slotsQuery,
    createReservation,
    guestTimeZone,
    monthKey,
    selectedSlotStart,
    selectedDateKey,
    guestDetails,
    setGuestDetails,
    alertMessage,
    showDetailsStep,
    showConflictForm,
    slotsPending,
    slotsError,
    slotsFetching,
    alertRef,
    detailsHeadingRef,
    pickerHeadingRef,
    handleSelectSlot,
    handleSelectDay,
    handleMonthChange,
    handleTimeZoneChange,
    handleChangeTime,
    handlePrefetchMonth,
    handleJumpToNextAvailable,
    handleSubmit,
  };
}
