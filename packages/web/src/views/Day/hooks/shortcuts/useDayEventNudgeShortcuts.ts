import { useCallback, useEffect, useRef } from "react";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import {
  isEventReadOnly,
  useCalendarLookup,
} from "@web/calendars/useCalendarLookup";
import { ID_SIDEBAR } from "@web/common/constants/web.constants";
import { type GridEvent } from "@web/common/types/web.event.types";
import { repositionDraftByKeyboard } from "@web/common/utils/draft/reposition-draft-by-keyboard.util";
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
import {
  draftActions,
  selectDraftStatus,
  selectGridDraft,
  useDraftStore,
} from "@web/events/stores/draft.store";
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
 * move a focused event by one day (it may leave the current Day view).
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
  const mutations = useEventMutations(dependencies);
  const { delete: deleteEvent } = mutations;
  const updateEvent = useUpdateEvent(dependencies);
  const gridDraft = useDraftStore(selectGridDraft);
  const draftStatus = useDraftStore(selectDraftStatus);

  const allDayEventsRef = useRef(allDayEvents);
  const timedEventsRef = useRef(timedEvents);
  const navigateToDateRef = useRef(navigateToDate);
  const gridDraftRef = useRef(gridDraft);
  const draftActivityRef = useRef(draftStatus?.activity);

  useEffect(() => {
    allDayEventsRef.current = allDayEvents;
    timedEventsRef.current = timedEvents;
  }, [allDayEvents, timedEvents]);

  useEffect(() => {
    navigateToDateRef.current = navigateToDate;
  }, [navigateToDate]);

  useEffect(() => {
    gridDraftRef.current = gridDraft;
    draftActivityRef.current = draftStatus?.activity;
  }, [draftStatus?.activity, gridDraft]);

  const findCalendarEventForTarget = useCallback(
    (target: DayGridEventTarget) => {
      const events =
        target.eventType === "all-day"
          ? allDayEventsRef.current
          : timedEventsRef.current;

      return (
        events.find((candidate) => candidate._id === target.eventId) ?? null
      );
    },
    [],
  );

  const getTargetedCalendarEvent = useCallback(() => {
    const target =
      getFocusedDayGridEventTarget() ??
      getHoveredDayGridEventTarget() ??
      getFirstVisibleDayGridEventTarget();

    if (!target) return null;

    const event = findCalendarEventForTarget(target);
    if (!event) return null;

    return { event, target };
  }, [findCalendarEventForTarget]);

  const deleteTargetedCalendarEvent = useCallback(
    (keyboardEvent: KeyboardEvent) => {
      if (
        isDeleteTextEditingTarget(keyboardEvent) ||
        isEventFormKeyboardTarget(keyboardEvent)
      ) {
        return;
      }

      if (document.activeElement?.closest(`#${ID_SIDEBAR}`)) {
        return;
      }

      const resolvedTarget = getTargetedCalendarEvent();
      if (!resolvedTarget) return;

      if (
        isEventReadOnly(
          calendarLookup,
          resolvedTarget.event.calendarId,
          resolvedTarget.event.isBusy ?? false,
        )
      ) {
        return;
      }

      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();

      deleteEventAndDiscardDraft(deleteEvent, resolvedTarget.event);
    },
    [calendarLookup, deleteEvent, getTargetedCalendarEvent],
  );

  const moveFocusedCalendarEvent = useCallback(
    (keyboardEvent: KeyboardEvent) => {
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

      const movement = getArrowKeyMovement(
        keyboardEvent.key,
        Boolean(event.isAllDay),
      );
      if (!movement) return;

      nudgeEventFromKeyboard({
        event,
        keyboardEvent,
        onNudge: (nudgedEvent) => {
          updateEvent({ event: nudgedEvent }, true);
        },
        afterNudge: () => draftActions.discard(),
      });
    },
    [calendarLookup, findCalendarEventForTarget, updateEvent],
  );

  const moveShortcutCreatedDraft = useCallback(
    (keyboardEvent: KeyboardEvent) => {
      if (isEditableKeyboardTarget(keyboardEvent)) return;

      const draft = gridDraftRef.current;
      const previousStart = draft
        ? dayjs(draft.values.schedule.start).startOf("day")
        : null;

      const nextDraft = repositionDraftByKeyboard({
        activity: draftActivityRef.current,
        draft,
        key: keyboardEvent.key,
      });
      if (!nextDraft) return;

      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();

      draftActions.setGridDraft(nextDraft);

      const nextStart = dayjs(nextDraft.values.schedule.start).startOf("day");
      if (previousStart && !nextStart.isSame(previousStart, "day")) {
        navigateToDateRef.current?.(nextStart);
      }
    },
    [],
  );

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
