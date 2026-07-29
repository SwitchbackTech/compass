import dayjs, { type Dayjs } from "@core/util/date/dayjs";
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
  isEventFormOpen,
} from "@web/common/utils/form/form.util";
import {
  type EventMutationDependencies,
  useEventMutations,
} from "@web/events/mutations/useEventMutations";
import { useUpdateEvent } from "@web/events/mutations/useUpdateEvent";
import { draftActions } from "@web/events/stores/draft.store";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";
import { deleteEventAndDiscardDraft } from "@web/views/Forms/hooks/useDeleteEvent";

const DRAFT_MOVEMENT_HOTKEY_OPTIONS = {
  ignoreInputs: false,
  preventDefault: false,
  stopPropagation: false,
} as const;

export type GridEventShortcutTarget = {
  eventId: string;
  eventType: "all-day" | "timed";
};

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
 * Shared Delete / Shift+arrow nudge / draft Arrow reposition shortcuts for
 * Day and Week. Targeting, day-boundary policy, and draft reposition stay
 * view-specific (Day follows across midnight; Week clamps to weekDays).
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
    getFocused: () => GridEventShortcutTarget | null;
    getHovered: () => GridEventShortcutTarget | null;
    getFirstVisible: () => GridEventShortcutTarget | null;
  };
  timedEvents: GridEvent[];
}) {
  const calendarLookup = useCalendarLookup();
  const { delete: deleteEvent } = useEventMutations(dependencies);
  const updateEvent = useUpdateEvent(dependencies);

  const findCalendarEventForTarget = (target: GridEventShortcutTarget) => {
    const events = target.eventType === "all-day" ? allDayEvents : timedEvents;
    return events.find((candidate) => candidate._id === target.eventId) ?? null;
  };

  const deleteTargetedCalendarEvent = (keyboardEvent: KeyboardEvent) => {
    if (
      isDeleteTextEditingTarget(keyboardEvent) ||
      isEventFormKeyboardTarget(keyboardEvent)
    ) {
      return;
    }

    if (document.activeElement?.closest(`#${ID_SIDEBAR}`)) {
      return;
    }

    const target =
      targeting.getFocused() ??
      targeting.getHovered() ??
      targeting.getFirstVisible();
    if (!target) return;

    const event = findCalendarEventForTarget(target);
    if (!event) return;

    if (isGridEventInteractionReadOnly(calendarLookup, event)) {
      return;
    }

    keyboardEvent.preventDefault();
    keyboardEvent.stopPropagation();
    deleteEventAndDiscardDraft(deleteEvent, event);
  };

  const moveFocusedCalendarEvent = (keyboardEvent: KeyboardEvent) => {
    if (isEventFormOpen()) return;

    // Focused only (no hover/first-visible fallback): moving an event the
    // user isn't focused on would be surprising.
    const target = targeting.getFocused();
    if (!target) return;

    const event = findCalendarEventForTarget(target);
    if (!event?._id) return;

    if (isGridEventInteractionReadOnly(calendarLookup, event)) {
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
  };

  const moveShortcutCreatedDraft = (keyboardEvent: KeyboardEvent) => {
    if (isEditableKeyboardTarget(keyboardEvent)) return;

    const didMove = repositionDraftByKey(keyboardEvent.key);
    if (!didMove) return;

    keyboardEvent.preventDefault();
    keyboardEvent.stopPropagation();
  };

  useAppShortcut("Delete", deleteTargetedCalendarEvent, {
    ignoreInputs: false,
  });
  useAppShortcut(
    "ArrowUp",
    moveShortcutCreatedDraft,
    DRAFT_MOVEMENT_HOTKEY_OPTIONS,
  );
  useAppShortcut(
    "ArrowDown",
    moveShortcutCreatedDraft,
    DRAFT_MOVEMENT_HOTKEY_OPTIONS,
  );
  useAppShortcut(
    "ArrowLeft",
    moveShortcutCreatedDraft,
    DRAFT_MOVEMENT_HOTKEY_OPTIONS,
  );
  useAppShortcut(
    "ArrowRight",
    moveShortcutCreatedDraft,
    DRAFT_MOVEMENT_HOTKEY_OPTIONS,
  );
  useAppShortcut("Shift+ArrowUp", moveFocusedCalendarEvent);
  useAppShortcut("Shift+ArrowDown", moveFocusedCalendarEvent);
  useAppShortcut("Shift+ArrowLeft", moveFocusedCalendarEvent);
  useAppShortcut("Shift+ArrowRight", moveFocusedCalendarEvent);
}
