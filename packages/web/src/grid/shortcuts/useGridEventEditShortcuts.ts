import { useQueryClient } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import {
  isGridEventInteractionReadOnly,
  useCalendarLookup,
} from "@web/calendars/useCalendarLookup";
import { ID_SIDEBAR } from "@web/common/constants/web.constants";
import { type GridEvent } from "@web/common/types/web.event.types";
import { getArrowKeyMovement } from "@web/common/utils/event/event-nudge.util";
import { nudgeEventFromKeyboard } from "@web/common/utils/event/event-nudge-shortcut.util";
import {
  isDeleteTextEditingTarget,
  isEditableKeyboardTarget,
  isEventFormKeyboardTarget,
} from "@web/common/utils/form/form.util";
import { duplicateGridEventDraft } from "@web/events/grid-event-draft.adapter";
import {
  type EventMutationDependencies,
  useEventMutations,
} from "@web/events/mutations/useEventMutations";
import { useUpdateEvent } from "@web/events/mutations/useUpdateEvent";
import { findEventInCache } from "@web/events/queries/event.query.cache";
import { draftActions, isEventFormOpen } from "@web/events/stores/draft.store";
import {
  type FocusableGridEventTarget,
  type GridEventShortcutTarget,
  getChronologicallyAdjacentTarget,
  getSpatiallyAdjacentTarget,
} from "@web/grid/shortcuts/focus-adjacent-grid-event";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";
import { deleteEventAndDiscardDraft } from "@web/views/Forms/hooks/useDeleteEvent";

const DRAFT_MOVEMENT_HOTKEY_OPTIONS = {
  ignoreInputs: false,
  preventDefault: false,
  stopPropagation: false,
} as const;

const isArrowKey = (
  key: string,
): key is "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" =>
  key === "ArrowUp" ||
  key === "ArrowDown" ||
  key === "ArrowLeft" ||
  key === "ArrowRight";

export type GridEventEditDayBoundary =
  | {
      kind: "follow";
      /** Day view: navigate so a day-crossing nudge stays on screen. */
      onCrossed: (date: Dayjs) => void;
      /**
       * Day view: ArrowLeft/Right page the visible day and focus that day's
       * first event after the route settles (when provided).
       */
      onFocusPageDay?: (direction: "previous" | "next") => void;
    }
  | {
      kind: "clamp";
      /** Week view: refuse nudges that leave the visible week window. */
      weekDays: Dayjs[];
    };

/**
 * Shared Delete / Mod+D / Shift+arrow nudge / draft Arrow reposition / focus
 * traversal shortcuts for Day and Week. Targeting, day-boundary policy, and
 * draft reposition stay view-specific (Day follows across midnight; Week
 * clamps to weekDays).
 *
 * Handlers close over latest render values; TanStack Hotkeys syncs the
 * callback each render, so event-list refs are unnecessary.
 */
export function useGridEventEditShortcuts({
  allDayEvents = [],
  dayBoundary,
  dependencies = {},
  repositionDraftByKey,
  targeting,
  timedEvents,
}: {
  allDayEvents?: GridEvent[];
  dayBoundary: GridEventEditDayBoundary;
  dependencies?: EventMutationDependencies;
  /**
   * View-owned draft move. Return true when the draft moved so the shared
   * hook can preventDefault. Day may also navigate here on day-cross.
   */
  repositionDraftByKey: (key: string) => boolean;
  targeting: {
    focus: (target: FocusableGridEventTarget) => void;
    getFocused: () => GridEventShortcutTarget | null;
    listVisible: () => FocusableGridEventTarget[];
  };
  timedEvents: GridEvent[];
}) {
  const calendarLookup = useCalendarLookup();
  const { data: calendars } = useCalendarsQuery();
  const queryClient = useQueryClient();
  const { delete: deleteEvent } = useEventMutations(dependencies);
  const updateEvent = useUpdateEvent(dependencies);

  const findCalendarEventForTarget = (target: GridEventShortcutTarget) => {
    const events = target.eventType === "all-day" ? allDayEvents : timedEvents;
    return events.find((candidate) => candidate._id === target.eventId) ?? null;
  };

  // Focused only (no hover/first-visible fallback): edit actions must
  // demand an explicit target.
  const getFocusedMutableCalendarEvent = () => {
    const target = targeting.getFocused();
    if (!target) return null;

    const event = findCalendarEventForTarget(target);
    if (!event) return null;

    if (isGridEventInteractionReadOnly(calendarLookup, event)) {
      return null;
    }

    return event;
  };

  const isFocusInSidebar = () =>
    Boolean(document.activeElement?.closest(`#${ID_SIDEBAR}`));

  const deleteFocusedCalendarEvent = (keyboardEvent: KeyboardEvent) => {
    if (
      isDeleteTextEditingTarget(keyboardEvent) ||
      isEventFormKeyboardTarget(keyboardEvent)
    ) {
      return;
    }

    if (isFocusInSidebar()) return;

    const event = getFocusedMutableCalendarEvent();
    if (!event) return;

    keyboardEvent.preventDefault();
    keyboardEvent.stopPropagation();
    deleteEventAndDiscardDraft(deleteEvent, event);
  };

  const duplicateFocusedCalendarEvent = (keyboardEvent: KeyboardEvent) => {
    if (isEventFormOpen() || isEventFormKeyboardTarget(keyboardEvent)) {
      return;
    }

    if (isFocusInSidebar()) return;

    const gridEvent = getFocusedMutableCalendarEvent();
    if (!gridEvent?._id) return;

    const sourceEvent = findEventInCache(queryClient, gridEvent._id);
    if (!sourceEvent) return;

    const duplicate = duplicateGridEventDraft(sourceEvent, calendars ?? []);
    if (!duplicate) return;

    keyboardEvent.preventDefault();
    keyboardEvent.stopPropagation();
    draftActions.startGridDraft({ activity: "gridClick", draft: duplicate });
    draftActions.setFormOpen(true);
  };

  const moveFocusedCalendarEvent = (keyboardEvent: KeyboardEvent) => {
    if (isEventFormOpen()) return;

    const event = getFocusedMutableCalendarEvent();
    if (!event?._id) return;

    const movement = getArrowKeyMovement(
      keyboardEvent.key,
      Boolean(event.isAllDay),
    );
    if (!movement) return;

    if (dayBoundary.kind === "clamp") {
      const start = dayjs(event.startDate);
      const { weekDays } = dayBoundary;
      if (movement.days === -1 && !start.isAfter(weekDays[0], "day")) {
        return;
      }
      if (
        movement.days === 1 &&
        !start.isBefore(weekDays[weekDays.length - 1], "day")
      ) {
        return;
      }
    }

    const previousStart = dayjs(event.startDate).startOf("day");

    nudgeEventFromKeyboard({
      event,
      keyboardEvent,
      onNudge: (nudgedEvent) => {
        updateEvent({ event: nudgedEvent }, true);
        if (dayBoundary.kind === "follow") {
          const nextStart = dayjs(nudgedEvent.startDate).startOf("day");
          if (!nextStart.isSame(previousStart, "day")) {
            dayBoundary.onCrossed(nextStart);
          }
        }
      },
      afterNudge: () => draftActions.discard(),
    });
  };

  const moveDraftOrFocusAdjacent = (keyboardEvent: KeyboardEvent) => {
    if (isEditableKeyboardTarget(keyboardEvent)) return;

    const didMove = repositionDraftByKey(keyboardEvent.key);
    if (didMove) {
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      return;
    }

    if (isEventFormOpen()) return;
    if (!isArrowKey(keyboardEvent.key)) return;

    // Day view: Left/Right page the calendar day, then focus its first event.
    // Require a focused grid event (same as Up/Down) so sidebar focus and
    // idle grid don't steal the day under the user.
    if (
      dayBoundary.kind === "follow" &&
      (keyboardEvent.key === "ArrowLeft" ||
        keyboardEvent.key === "ArrowRight") &&
      dayBoundary.onFocusPageDay
    ) {
      if (isFocusInSidebar() || !targeting.getFocused()) return;

      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      dayBoundary.onFocusPageDay(
        keyboardEvent.key === "ArrowLeft" ? "previous" : "next",
      );
      return;
    }

    if (dayBoundary.kind === "follow") {
      if (
        keyboardEvent.key !== "ArrowUp" &&
        keyboardEvent.key !== "ArrowDown"
      ) {
        return;
      }

      const adjacent = getChronologicallyAdjacentTarget({
        allDayEvents,
        direction: keyboardEvent.key === "ArrowUp" ? "previous" : "next",
        focused: targeting.getFocused(),
        timedEvents,
        visible: targeting.listVisible(),
      });
      if (!adjacent) return;

      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      adjacent.element.scrollIntoView({ block: "nearest" });
      targeting.focus(adjacent);
      return;
    }

    const spatialDirection =
      keyboardEvent.key === "ArrowUp"
        ? "up"
        : keyboardEvent.key === "ArrowDown"
          ? "down"
          : keyboardEvent.key === "ArrowLeft"
            ? "left"
            : "right";

    const adjacent = getSpatiallyAdjacentTarget({
      allDayEvents,
      direction: spatialDirection,
      focused: targeting.getFocused(),
      timedEvents,
      visible: targeting.listVisible(),
      weekDays: dayBoundary.weekDays,
    });
    if (!adjacent) return;

    keyboardEvent.preventDefault();
    keyboardEvent.stopPropagation();
    adjacent.element.scrollIntoView({ block: "nearest" });
    targeting.focus(adjacent);
  };

  useAppShortcut("Delete", deleteFocusedCalendarEvent, {
    ignoreInputs: false,
  });
  useAppShortcut("Mod+D", duplicateFocusedCalendarEvent, {
    ignoreInputs: false,
    conflictBehavior: "allow",
  });
  useAppShortcut(
    "ArrowUp",
    moveDraftOrFocusAdjacent,
    DRAFT_MOVEMENT_HOTKEY_OPTIONS,
  );
  useAppShortcut(
    "ArrowDown",
    moveDraftOrFocusAdjacent,
    DRAFT_MOVEMENT_HOTKEY_OPTIONS,
  );
  useAppShortcut(
    "ArrowLeft",
    moveDraftOrFocusAdjacent,
    DRAFT_MOVEMENT_HOTKEY_OPTIONS,
  );
  useAppShortcut(
    "ArrowRight",
    moveDraftOrFocusAdjacent,
    DRAFT_MOVEMENT_HOTKEY_OPTIONS,
  );
  useAppShortcut("Shift+ArrowUp", moveFocusedCalendarEvent);
  useAppShortcut("Shift+ArrowDown", moveFocusedCalendarEvent);
  useAppShortcut("Shift+ArrowLeft", moveFocusedCalendarEvent);
  useAppShortcut("Shift+ArrowRight", moveFocusedCalendarEvent);
}
