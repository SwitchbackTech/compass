import { Origin } from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_COMPACT_FORMAT } from "@core/constants/date.constants";
import { Status } from "@core/errors/status.codes";
import {
  type BaseEvent,
  type CompassEvent,
} from "@core/types/compass-event.contracts";
import { EventMutationErrorSchema } from "@core/types/event-command.contracts";
import { type WithId } from "@core/types/type.utils";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { type ApiError } from "@web/api/api.types";
import { isBackendUnavailableError } from "@web/api/util/backend-unavailable-error.util";
import { getUserId } from "@web/auth/compass/session/session.util";
import { GENERIC_ERROR_TOAST_ID } from "@web/common/constants/toast.constants";
import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import { type PartialMouseEvent } from "@web/common/types/util.types";
import {
  Categories_Event,
  type GridEvent,
  type WebEvent,
} from "@web/common/types/web.event.types";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";

export const gridEventDefaultPosition: GridEvent["position"] = {
  isOverlapping: false,
  totalEventsInGroup: 1,
  widthMultiplier: 1,
  horizontalOrder: 1,
  initialX: null,
  initialY: null,
  dragOffset: { x: 0, y: 0 },
};

export const addId = (event: GridEvent): WithId<GridEvent> => {
  const _event = {
    ...event,
    _id: createObjectIdString(),
  } as WithId<GridEvent>;

  return _event;
};

export type EventWithDates = CompassEvent & {
  startDate: string;
  endDate: string;
};

const assembleWebEvent = (event: EventWithDates): WebEvent => ({
  ...event,
  startDate: event.startDate,
  endDate: event.endDate,
  origin: event.origin ?? Origin.COMPASS,
  user: event.user ?? "",
  recurrence: event.recurrence as WebEvent["recurrence"],
});

export const assembleDefaultEvent = async (
  draftType?: Categories_Event | null,
  startDate?: string,
  endDate?: string,
): Promise<CompassEvent | GridEvent> => {
  const userId = await getUserId();
  const baseEvent = _assembleBaseEvent(userId, {});

  switch (draftType) {
    case Categories_Event.ALLDAY: {
      const defaultAllday: CompassEvent = {
        ...baseEvent,
        isAllDay: true,
        startDate,
        endDate: endDate ?? startDate,
      };
      return defaultAllday;
    }
    case Categories_Event.TIMED: {
      const defaultTimed: GridEvent = {
        ...baseEvent,
        _id: baseEvent._id!,
        isAllDay: false,
        startDate: startDate!,
        endDate: endDate!,
        position: gridEventDefaultPosition,
        origin: baseEvent.origin ?? Origin.COMPASS,
        user: baseEvent.user!,
        recurrence: baseEvent.recurrence as BaseEvent["recurrence"],
      };
      return defaultTimed;
    }
    default:
      return baseEvent;
  }
};

export const assembleGridEvent = (event: EventWithDates): GridEvent => {
  const gridEvent: GridEvent = {
    ...assembleWebEvent(event),
    position: gridEventDefaultPosition,
    _id: event._id!,
  };

  return gridEvent;
};

export const getEventDragOffset = (
  event?: GridEvent,
  e?: PartialMouseEvent,
): GridEvent["position"]["dragOffset"] => {
  if (!event || !e) return { x: 0, y: 0 };

  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
};

export const getCalendarEventIdFromElement = (element: HTMLElement) => {
  const eventElement = element.closest(`[${DATA_EVENT_ELEMENT_ID}]`);
  return eventElement ? eventElement.getAttribute(DATA_EVENT_ELEMENT_ID) : null;
};

/**
 * Refocuses an event's element after React replaces it. Retries across
 * animation frames until the new element appears, then focuses it.
 */
export const refocusEventElement = (eventId: string) => {
  const selector = `[${DATA_EVENT_ELEMENT_ID}="${eventId}"]`;
  const staleElement = document.querySelector(selector);
  let attemptsLeft = 30;

  const tryFocus = () => {
    const element = document.querySelector<HTMLElement>(selector);
    if (element && element !== staleElement) {
      element.focus();
    } else if (attemptsLeft-- > 0) {
      requestAnimationFrame(tryFocus);
    }
  };

  tryFocus();
};

export const getWeekDayLabel = (day: Dayjs | Date) => {
  if (day instanceof Date) {
    return dayjs(day).format(YEAR_MONTH_DAY_COMPACT_FORMAT);
  }
  return day.format(YEAR_MONTH_DAY_COMPACT_FORMAT);
};

/**
 * A retryable mutation failure the backend authored - e.g. a 502
 * PROVIDER_FAILURE thrown when Google rejects a write. The app already treats
 * these as retryable, so they only warrant a toast; console.error'ing them
 * re-surfaces every routine provider hiccup as a brand-new error-tracking issue
 * (capture_console_errors turns deliberate logging into exception capture).
 */
const isRetryableMutationError = (error: Error): boolean => {
  const parsed = EventMutationErrorSchema.safeParse(
    (error as ApiError).response?.data,
  );
  return parsed.success && parsed.data.retryable;
};

const CATCHALL_TOAST_MESSAGE =
  "Something went wrong behind the scenes. Please try again later.";

const showCatchallToast = (message: string) =>
  showErrorToast(message, { toastId: GENERIC_ERROR_TOAST_ID });

export const handleError = (error: Error) => {
  if (isBackendUnavailableError(error)) {
    return;
  }

  // Prefer the structured status on ApiError; fall back to the trailing
  // status digits in the message for errors that only carry text.
  const code =
    (error as ApiError).response?.status ??
    parseInt(error.message.slice(-3), 10);

  // GONE/UNAUTHORIZED are session-level failures — the api interceptor signs
  // the user out, which has its own messaging, so nothing more is shown here.
  if (code === Status.GONE || code === Status.UNAUTHORIZED) {
    return;
  }
  // NOT_FOUND is not a session failure (e.g. syncing onto a calendar the
  // server hasn't provisioned yet) — the interceptor only console.error's it
  // and rethrows. Left unhandled here, the optimistic edit silently rolls
  // back with no visible feedback at all.
  if (code === Status.NOT_FOUND) {
    showCatchallToast(CATCHALL_TOAST_MESSAGE);
    return;
  }

  if (isRetryableMutationError(error)) {
    // Expected transient failure: nudge the user to retry without logging it.
    showCatchallToast(CATCHALL_TOAST_MESSAGE);
    return;
  }

  // Log the message string, not the Error object — `capture_console_errors`
  // turns `console.error(error)` into a fresh error-tracking issue.
  console.error(error.message);

  if (code === Status.INTERNAL_SERVER) {
    showCatchallToast(CATCHALL_TOAST_MESSAGE);
    return;
  }

  showCatchallToast(error.message);
};

export const isEventInRange = (
  eventDate: { start: string; end: string },
  rangeDate: { start: string; end: string },
) => {
  const isStartDateInRange = dayjs(eventDate.start).isBetween(
    rangeDate.start,
    rangeDate.end,
    "day",
    "[]",
  );
  const isEndDateInRange = dayjs(eventDate.end).isBetween(
    rangeDate.start,
    rangeDate.end,
    "day",
    "[]",
  );

  return isStartDateInRange || isEndDateInRange;
};

const _assembleBaseEvent = (
  userId: string,
  event: Partial<CompassEvent>,
): CompassEvent => {
  const baseEvent = {
    _id: event._id,
    title: event.title ?? "",
    description: event.description ?? "",
    startDate: event.startDate,
    endDate: event.endDate,
    user: userId,
    isAllDay: event.isAllDay ?? false,
    origin: event.origin ?? Origin.COMPASS,
  };

  return baseEvent;
};
