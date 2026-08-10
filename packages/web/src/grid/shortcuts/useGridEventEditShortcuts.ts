import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import {
  isGridEventInteractionReadOnly,
  useCalendarLookup,
} from "@web/calendars/useCalendarLookup";
import { ID_SIDEBAR } from "@web/common/constants/web.constants";
import { type GridEvent } from "@web/common/types/web.event.types";
import {
  type EventEdge,
  getArrowKeyMovement,
} from "@web/common/utils/event/event-nudge.util";
import {
  nudgeEventEdgeFromKeyboard,
  nudgeEventFromKeyboard,
} from "@web/common/utils/event/event-nudge-shortcut.util";
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
import {
  draftActions,
  isEventFormOpen,
  useDraftStore,
} from "@web/events/stores/draft.store";
import {
  edgeFocusActions,
  useEdgeFocusStore,
} from "@web/grid/shortcuts/edge-focus.store";
import {
  type FocusableGridEventTarget,
  findCalendarEventForTarget,
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
  placeTimedDraft,
  repositionDraftByKey,
  targeting,
  timedEvents,
}: {
  allDayEvents?: GridEvent[];
  dayBoundary: GridEventEditDayBoundary;
  dependencies?: EventMutationDependencies;
  /**
   * Shift+Arrow place-create when nothing is focused and no draft can move.
   * Seeds a timed draft at the same default as `c`, form closed.
   */
  placeTimedDraft?: () => void;
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

  // Focused only (no hover/first-visible fallback): edit actions must
  // demand an explicit target.
  const getFocusedMutableCalendarEvent = () => {
    const target = targeting.getFocused();
    if (!target) return null;

    const event = findCalendarEventForTarget(target, {
      allDayEvents,
      timedEvents,
    });
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

  const describeEdgeDate = (event: GridEvent, edge: EventEdge) => {
    const date = edge === "startDate" ? event.startDate : event.endDate;
    if (!date) return "";
    const label = event.isAllDay
      ? dayjs(date).format("MMM D")
      : dayjs(date).format("h:mm A");
    const edgeName = edge === "startDate" ? "Start" : "End";
    return `${edgeName} ${label}`;
  };

  const moveFocusedEventEdge = (
    keyboardEvent: KeyboardEvent,
    event: GridEvent,
    edge: EventEdge,
  ) => {
    if (!event._id) return;

    const movement = getArrowKeyMovement(
      keyboardEvent.key,
      Boolean(event.isAllDay),
    );
    if (!movement) return;

    if (dayBoundary.kind === "clamp" && event.isAllDay) {
      const { weekDays } = dayBoundary;
      // All-day endDate is stored exclusive (the day after the last occupied
      // day), so it's shifted back a day to compare against the inclusive
      // weekDays window — matching nudgeAllDayEdgeDates's own inclusiveEnd.
      const edgeDate =
        edge === "startDate"
          ? dayjs(event.startDate)
          : dayjs(event.endDate).subtract(1, "day");
      if (movement.days === -1 && !edgeDate.isAfter(weekDays[0], "day")) {
        return;
      }
      if (
        movement.days === 1 &&
        !edgeDate.isBefore(weekDays[weekDays.length - 1], "day")
      ) {
        return;
      }
    }

    nudgeEventEdgeFromKeyboard({
      edge,
      event,
      keyboardEvent,
      onNudge: (nudgedEvent, nextEdge) => {
        updateEvent({ event: nudgedEvent }, true);
        edgeFocusActions.setEdge(
          event._id!,
          nextEdge,
          describeEdgeDate(nudgedEvent, nextEdge),
        );
      },
      afterNudge: () => draftActions.discard(),
    });
  };

  const moveFocusedCalendarEvent = (keyboardEvent: KeyboardEvent) => {
    if (isEventFormOpen()) return;

    const event = getFocusedMutableCalendarEvent();
    if (event?._id) {
      const edgeFocus = useEdgeFocusStore.getState();
      if (edgeFocus.eventId === event._id && edgeFocus.edge) {
        moveFocusedEventEdge(keyboardEvent, event, edgeFocus.edge);
        return;
      }

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
      return;
    }

    // No focused mutable saved event: reposition a form-closed draft, or
    // place one when the grid is idle. Do not place over an existing draft
    // (failed clamp/midnight move) or while a read-only/draft card is focused.
    const didMoveDraft = repositionDraftByKey(keyboardEvent.key);
    if (didMoveDraft) {
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      return;
    }

    if (targeting.getFocused() || useDraftStore.getState().gridDraft) {
      return;
    }

    placeTimedDraft?.();
  };

  const cycleEdgeFocus = (keyboardEvent: KeyboardEvent) => {
    if (isEventFormOpen() || isEditableKeyboardTarget(keyboardEvent)) return;
    if (isFocusInSidebar()) return;

    const event = getFocusedMutableCalendarEvent();
    if (!event?._id) return;

    const forward = !keyboardEvent.shiftKey;
    const { eventId, edge } = useEdgeFocusStore.getState();
    const currentEdge = eventId === event._id ? edge : null;
    // Forward enters at the start edge and exits (natively, past the end
    // edge) rather than wrapping — an unconditional wrap would trap keyboard
    // focus on the card forever, since Tab is the only way in or out.
    const exiting = forward
      ? currentEdge === "endDate"
      : currentEdge === "startDate";
    if (exiting) {
      edgeFocusActions.reset();
      return;
    }

    keyboardEvent.preventDefault();
    keyboardEvent.stopPropagation();
    edgeFocusActions.cycle(event._id, forward ? "forward" : "backward");
  };

  const clearEdgeFocus = () => {
    if (!useEdgeFocusStore.getState().eventId) return;
    edgeFocusActions.reset();
  };

  // `targeting` is a fresh object every render for some callers (Day/Week
  // build it inline), so the settle effect below reads it through a ref
  // instead of depending on it directly — otherwise it would tear down and
  // rebuild its listeners on every unrelated re-render, which can cancel a
  // check that was already in flight.
  const targetingRef = useRef(targeting);
  targetingRef.current = targeting;

  // Edge focus tracks a specific event's DOM element, which React replaces
  // after every committed nudge (refocusEventElement restores focus to the
  // new element within a few frames). A focusin landing on a *different*
  // event is unambiguous and resets immediately. A focusin/focusout landing
  // on nothing (the brief focus-to-body gap mid-remount) is ambiguous, so
  // that case alone waits a tick for refocusEventElement to restore focus
  // before treating it as "focus left the event".
  useEffect(() => {
    let timer = 0;
    const checkAfterDelay = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const { eventId } = useEdgeFocusStore.getState();
        if (!eventId) return;
        if (targetingRef.current.getFocused()?.eventId !== eventId) {
          edgeFocusActions.reset();
        }
      }, 0);
    };
    const sync = () => {
      const { eventId } = useEdgeFocusStore.getState();
      if (!eventId) return;

      const focused = targetingRef.current.getFocused();
      if (!focused) {
        checkAfterDelay();
        return;
      }
      if (focused.eventId !== eventId) {
        window.clearTimeout(timer);
        edgeFocusActions.reset();
      }
    };

    document.addEventListener("focusin", sync);
    document.addEventListener("focusout", sync);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("focusin", sync);
      document.removeEventListener("focusout", sync);
    };
  }, []);

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

    // Day view: all four arrows move chronological focus. Period changes stay
    // on j/k (same split as week view: arrows focus, j/k navigate).
    if (dayBoundary.kind === "follow") {
      const adjacent = getChronologicallyAdjacentTarget({
        allDayEvents,
        direction:
          keyboardEvent.key === "ArrowUp" || keyboardEvent.key === "ArrowLeft"
            ? "previous"
            : "next",
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
  useAppShortcut("Tab", cycleEdgeFocus, DRAFT_MOVEMENT_HOTKEY_OPTIONS);
  useAppShortcut("Shift+Tab", cycleEdgeFocus, DRAFT_MOVEMENT_HOTKEY_OPTIONS);
  useAppShortcut("Escape", clearEdgeFocus, DRAFT_MOVEMENT_HOTKEY_OPTIONS);
}
