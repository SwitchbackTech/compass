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
import { getPosthogClient } from "@web/auth/posthog/posthog.bootstrap";
import { GENERIC_ERROR_TOAST_ID } from "@web/common/constants/toast.constants";
import { type PartialMouseEvent } from "@web/common/types/util.types";
import {
  Categories_Event,
  type GridEvent,
  type WebEvent,
} from "@web/common/types/web.event.types";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import {
  calendarEventIdValueSelector,
  readCalendarEventIdFromElement,
} from "@web/grid/interaction/view-event-registry";

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

export const getCalendarEventIdFromElement = (element: HTMLElement) =>
  readCalendarEventIdFromElement(element);

/**
 * Focuses a calendar event's DOM node as soon as it exists. Retries across
 * animation frames when the card is not mounted yet (e.g. after form close or
 * undo restore). Unlike `refocusEventElement`, this focuses an in-place node
 * and does not wait for React to replace it.
 */
export const focusCalendarEventElement = (eventId: string) => {
  const selector = calendarEventIdValueSelector(eventId);
  let attempts = 0;

  const tryFocus = () => {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      element.focus();
      return;
    }
    if (++attempts < 30) requestAnimationFrame(tryFocus);
  };

  tryFocus();
};

const isGridDraftEventSurface = (element: HTMLElement) =>
  element.getAttribute("data-grid-event-surface") === "draft";

/**
 * Focuses the grid event after the form draft is discarded. Skips `GridDraft`
 * portal nodes (same interaction id, unmounts on the next commit) and retries
 * across animation frames until a saved/placeholder card is available.
 */
export const focusCalendarEventElementAfterDiscard = (eventId: string) => {
  const selector = calendarEventIdValueSelector(eventId);
  let attempts = 0;

  const tryFocus = () => {
    attempts += 1;
    const element = [...document.querySelectorAll<HTMLElement>(selector)].find(
      (candidate) => !isGridDraftEventSurface(candidate),
    );
    if (element) {
      element.focus();
      return;
    }
    if (attempts < 30) requestAnimationFrame(tryFocus);
  };

  requestAnimationFrame(tryFocus);
};

/**
 * Refocuses an event's element after React replaces it. Retries across
 * animation frames until the new element appears, then focuses it.
 */
export const refocusEventElement = (eventId: string) => {
  const selector = calendarEventIdValueSelector(eventId);
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
 * A known mutation failure authored by the backend. These have user-facing
 * feedback already, so they must not create error-tracking issues.
 */
const isExpectedMutationError = (error: Error): boolean => {
  const parsed = EventMutationErrorSchema.safeParse(
    (error as ApiError).response?.data,
  );
  return parsed.success;
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

  if (isExpectedMutationError(error)) {
    // The backend authored a known mutation failure. Show its existing UI
    // feedback without creating an error-tracking issue.
    showCatchallToast(CATCHALL_TOAST_MESSAGE);
    return;
  }

  getPosthogClient()?.captureException(error, {
    $exception_handled: true,
    $exception_source: "event-mutation",
    httpStatus: Number.isNaN(code) ? undefined : code,
  });
  console.error(error);

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
