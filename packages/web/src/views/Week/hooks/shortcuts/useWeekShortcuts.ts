import { useCallback, useEffect, useRef } from "react";
import { type EventId } from "@core/types/domain-primitives";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import {
  isEventReadOnly,
  useCalendarLookup,
} from "@web/calendars/useCalendarLookup";
import { ID_SIDEBAR } from "@web/common/constants/web.constants";
import { onViewCommand } from "@web/common/utils/dom/view-command-bus";
import {
  createAlldayDraft,
  createTimedDraft,
} from "@web/common/utils/draft/draft.util";
import { getArrowKeyMovement } from "@web/common/utils/event/event-nudge.util";
import { nudgeEventFromKeyboard } from "@web/common/utils/event/event-nudge-shortcut.util";
import {
  isDeleteTextEditingTarget,
  isEditableKeyboardTarget,
  isEventFormKeyboardTarget,
  isEventFormOpen,
} from "@web/common/utils/form/form.util";
import { focusFirstSidebarItem } from "@web/components/Sidebar/util/sidebarFocus.util";
import { type GridScheduleDraft } from "@web/events/event-draft.types";
import {
  editGridEventDraft,
  replaceGridDraftSchedule,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
import { useEventMutations } from "@web/events/mutations/useEventMutations";
import { useWeekEventViewModel } from "@web/events/queries/useWeekEventsQuery";
import { draftActions } from "@web/events/stores/draft.store";
import {
  selectIsSidebarOpen,
  useViewStore,
  viewActions,
} from "@web/events/stores/view.store";
import {
  useAppShortcut,
  useAppShortcutUp,
} from "@web/shortcuts/useAppShortcut";
import { deleteEventAndDiscardDraft } from "@web/views/Forms/hooks/useDeleteEvent";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";
import { type Util_Scroll } from "@web/views/Week/hooks/grid/useScroll";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import {
  focusGridEventTarget,
  type GridEventTarget,
  getFirstVisibleGridEventTarget,
  getFocusedGridEventTarget,
  getHoveredGridEventTarget,
} from "@web/views/Week/interaction/targeting/week-event.targeting";

export interface ShortcutProps {
  isCurrentWeek: boolean;
  startOfView: Dayjs;
  endOfView: Dayjs;
  weekDays: Dayjs[];
  util: WeekProps["util"];
  scrollUtil: Util_Scroll;
}

const DRAFT_MOVEMENT_HOTKEY_OPTIONS = {
  ignoreInputs: false,
  preventDefault: false,
  stopPropagation: false,
} as const;

export const useWeekShortcuts = ({
  isCurrentWeek,
  startOfView,
  endOfView,
  weekDays,
  util,
  scrollUtil,
}: ShortcutProps) => {
  const mutations = useEventMutations();
  const { delete: deleteEvent } = mutations;
  // Read-only (unwritable calendar or busy content) events can be inspected
  // but never mutated - delete and nudge/move below gate on this before
  // touching the store (packet 08 step 8).
  const calendarLookup = useCalendarLookup();
  const {
    actions: { repositionDraftByKeyboard },
    confirmation,
  } = useDraftContext();

  const isSidebarOpen = useViewStore(selectIsSidebarOpen);
  const { allDayEvents, entities, timedEvents } = useWeekEventViewModel({
    startOfView,
    endOfView,
  });
  const allDayEventsRef = useRef(allDayEvents);
  const timedEventsRef = useRef(timedEvents);
  const { decrementWeek, incrementWeek, goToToday, shiftViewByDay } = util;
  const { scrollToNow } = scrollUtil;

  useEffect(() => {
    allDayEventsRef.current = allDayEvents;
    timedEventsRef.current = timedEvents;
  }, [allDayEvents, timedEvents]);

  const _discardDraft = useCallback(() => {
    if (isEventFormOpen()) {
      draftActions.discard();
    }
  }, []);

  const goToPreviousWeek = useCallback(() => {
    _discardDraft();
    decrementWeek();
  }, [decrementWeek, _discardDraft]);

  const toToday = useCallback(() => {
    scrollToNow();
    _discardDraft();
    goToToday();
  }, [scrollToNow, _discardDraft, goToToday]);

  const goToNextWeek = useCallback(() => {
    _discardDraft();
    incrementWeek();
  }, [incrementWeek, _discardDraft]);

  const shiftViewBackward = useCallback(() => {
    _discardDraft();
    shiftViewByDay(-1);
  }, [_discardDraft, shiftViewByDay]);

  const shiftViewForward = useCallback(() => {
    _discardDraft();
    shiftViewByDay(1);
  }, [_discardDraft, shiftViewByDay]);

  const createAllDayDraftEvent = useCallback(() => {
    void createAlldayDraft(startOfView, endOfView, "createShortcut");
  }, [startOfView, endOfView]);

  const createTimedDraftEvent = useCallback(() => {
    void createTimedDraft(isCurrentWeek, startOfView, "createShortcut");
  }, [isCurrentWeek, startOfView]);

  // The command palette's create-event rows emit these same commands
  // (event.cmd.constants.ts) so the "C"/"A" keys and the palette rows run
  // identical code. Resubscribes only when the week in view changes (these
  // callbacks are memoized on startOfView/endOfView/isCurrentWeek).
  useEffect(() => {
    const unsubscribeCreateAllDayDraft = onViewCommand(
      "CREATE_ALLDAY_DRAFT",
      createAllDayDraftEvent,
    );
    const unsubscribeCreateTimedDraft = onViewCommand(
      "CREATE_TIMED_DRAFT",
      createTimedDraftEvent,
    );

    return () => {
      unsubscribeCreateAllDayDraft();
      unsubscribeCreateTimedDraft();
    };
  }, [createAllDayDraftEvent, createTimedDraftEvent]);

  const focusSidebar = useCallback(() => {
    if (!isSidebarOpen) {
      viewActions.toggleSidebar();
      // The sidebar renders conditionally; focus after the open commits
      requestAnimationFrame(() => focusFirstSidebarItem());
      return;
    }

    focusFirstSidebarItem();
  }, [isSidebarOpen]);

  const focusFirstCalendarEvent = useCallback(() => {
    const target = getFirstVisibleGridEventTarget();
    if (!target) return;

    focusGridEventTarget(target);
  }, []);

  const findCalendarEventForTarget = useCallback((target: GridEventTarget) => {
    const events =
      target.eventType === "all-day"
        ? allDayEventsRef.current
        : timedEventsRef.current;

    return events.find((candidate) => candidate._id === target.eventId) ?? null;
  }, []);

  const getTargetedCalendarEvent = useCallback(() => {
    const target =
      getFocusedGridEventTarget() ??
      getHoveredGridEventTarget() ??
      getFirstVisibleGridEventTarget();

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

      // Focus inside the sidebar (e.g. via the "u" shortcut) means the user
      // is acting on the sidebar, not grid events
      if (document.activeElement?.closest(`#${ID_SIDEBAR}`)) {
        return;
      }

      const resolvedTarget = getTargetedCalendarEvent();
      if (!resolvedTarget) {
        return;
      }

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
      // user isn't focused on would be surprising
      const target = getFocusedGridEventTarget();
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

      const start = dayjs(event.startDate);

      if (movement.days === -1 && !start.isAfter(weekDays[0], "day")) {
        return;
      }

      if (
        movement.days === 1 &&
        !start.isBefore(weekDays[weekDays.length - 1], "day")
      ) {
        return;
      }

      nudgeEventFromKeyboard({
        event,
        keyboardEvent,
        onNudge: (nudgedEvent) => {
          const sourceEvent = nudgedEvent._id
            ? entities[nudgedEvent._id as EventId]
            : undefined;
          const draft = sourceEvent
            ? editGridEventDraft(sourceEvent, "this")
            : null;
          if (!draft) return;

          const schedule: GridScheduleDraft = nudgedEvent.isAllDay
            ? {
                kind: "allDay",
                start: dayjs(nudgedEvent.startDate).toDate(),
                end: dayjs(nudgedEvent.endDate).toDate(),
              }
            : timedGridSchedule(
                dayjs(nudgedEvent.startDate).toDate(),
                dayjs(nudgedEvent.endDate).toDate(),
              );

          void confirmation.onSubmit(replaceGridDraftSchedule(draft, schedule));
        },
      });
    },
    [
      calendarLookup,
      confirmation,
      entities,
      findCalendarEventForTarget,
      weekDays,
    ],
  );

  const moveShortcutCreatedDraft = useCallback(
    (event: KeyboardEvent) => {
      if (isEditableKeyboardTarget(event)) return;

      const didMove = repositionDraftByKeyboard(event.key);
      if (!didMove) return;

      event.preventDefault();
      event.stopPropagation();
    },
    [repositionDraftByKeyboard],
  );

  useAppShortcutUp("J", goToPreviousWeek);
  useAppShortcutUp("K", goToNextWeek);
  useAppShortcutUp("Shift+J", shiftViewBackward);
  useAppShortcutUp("Shift+K", shiftViewForward);
  useAppShortcutUp("T", toToday);
  useAppShortcutUp("A", createAllDayDraftEvent);
  useAppShortcutUp("C", createTimedDraftEvent);
  useAppShortcutUp("U", focusSidebar);
  useAppShortcutUp("I", focusFirstCalendarEvent);
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
};
