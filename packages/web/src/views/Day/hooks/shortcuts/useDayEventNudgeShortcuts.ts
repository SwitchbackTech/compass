import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import {
  isEventReadOnly,
  useCalendarLookup,
} from "@web/calendars/useCalendarLookup";
import { ID_SIDEBAR } from "@web/common/constants/web.constants";
import { type GridEvent } from "@web/common/types/web.event.types";
import { repositionDraftByKeyboard } from "@web/common/utils/draft/reposition-draft-by-keyboard.util";
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
import { draftActions, useDraftStore } from "@web/events/stores/draft.store";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";
import {
  type DayGridEventTarget,
  getFirstVisibleDayGridEventTarget,
  getFocusedDayGridEventTarget,
  getHoveredDayGridEventTarget,
} from "@web/views/Day/interaction/targeting/day-event.targeting";
import { deleteEventAndDiscardDraft } from "@web/views/Forms/hooks/useDeleteEvent";

const DRAFT_MOVEMENT_HOTKEY_OPTIONS = {
  ignoreInputs: false,
  preventDefault: false,
  stopPropagation: false,
} as const;

/**
 * Day-view edit shortcuts shared with Week: Delete, Shift+arrows (nudge /
 * day-move), and Arrow keys to reposition an open draft. Shift+ArrowLeft/Right
 * move a focused event by one day and follow that day in the Day view.
 *
 * Handlers close over latest render values; TanStack Hotkeys syncs the
 * callback each render, so event-list refs are unnecessary.
 */
export function useDayEventNudgeShortcuts({
  allDayEvents = [],
  dependencies = {},
  navigateToDate,
  timedEvents,
}: {
  allDayEvents?: GridEvent[];
  dependencies?: EventMutationDependencies;
  /** Follow draft Left/Right moves so the draft stays on screen. */
  navigateToDate?: (date: Dayjs) => void;
  timedEvents: GridEvent[];
}) {
  const calendarLookup = useCalendarLookup();
  const { delete: deleteEvent } = useEventMutations(dependencies);
  const updateEvent = useUpdateEvent(dependencies);

  const findCalendarEventForTarget = (target: DayGridEventTarget) => {
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
      getFocusedDayGridEventTarget() ??
      getHoveredDayGridEventTarget() ??
      getFirstVisibleDayGridEventTarget();
    if (!target) return;

    const event = findCalendarEventForTarget(target);
    if (!event) return;

    if (
      isEventReadOnly(calendarLookup, event.calendarId, event.isBusy ?? false)
    ) {
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
    const target = getFocusedDayGridEventTarget();
    if (!target) return;

    const event = findCalendarEventForTarget(target);
    if (!event?._id) return;

    if (
      isEventReadOnly(calendarLookup, event.calendarId, event.isBusy ?? false)
    ) {
      return;
    }

    const previousStart = dayjs(event.startDate).startOf("day");

    nudgeEventFromKeyboard({
      event,
      keyboardEvent,
      onNudge: (nudgedEvent) => {
        updateEvent({ event: nudgedEvent }, true);
        const nextStart = dayjs(nudgedEvent.startDate).startOf("day");
        if (!nextStart.isSame(previousStart, "day")) {
          navigateToDate?.(nextStart);
        }
      },
      afterNudge: () => draftActions.discard(),
    });
  };

  const moveShortcutCreatedDraft = (keyboardEvent: KeyboardEvent) => {
    if (isEditableKeyboardTarget(keyboardEvent)) return;

    const { gridDraft, status } = useDraftStore.getState();
    const previousStart = gridDraft
      ? dayjs(gridDraft.values.schedule.start).startOf("day")
      : null;

    const nextDraft = repositionDraftByKeyboard({
      activity: status?.activity,
      draft: gridDraft,
      key: keyboardEvent.key,
    });
    if (!nextDraft) return;

    keyboardEvent.preventDefault();
    keyboardEvent.stopPropagation();
    draftActions.setGridDraft(nextDraft);

    const nextStart = dayjs(nextDraft.values.schedule.start).startOf("day");
    if (previousStart && !nextStart.isSame(previousStart, "day")) {
      navigateToDate?.(nextStart);
    }
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
