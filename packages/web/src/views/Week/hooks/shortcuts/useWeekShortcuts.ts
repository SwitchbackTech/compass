import { useCallback, useEffect, useRef } from "react";
import { SOMEDAY_WEEK_LIMIT_MSG } from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Categories_Event } from "@core/types/event.types";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { getDefaultTargetCalendar } from "@web/calendars/calendar.util";
import { ID_SIDEBAR } from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  createAlldayDraft,
  createTimedDraft,
} from "@web/common/utils/draft/draft.util";
import { refocusEventElement } from "@web/common/utils/event/event.util";
import { getArrowKeyMovement } from "@web/common/utils/event/event-nudge.util";
import { nudgeEventFromKeyboard } from "@web/common/utils/event/event-nudge-shortcut.util";
import { buildConvertToSomedayEvent } from "@web/common/utils/event/someday.event.util";
import {
  isDeleteTextEditingTarget,
  isEditableKeyboardTarget,
  isEventFormKeyboardTarget,
  isEventFormOpen,
} from "@web/common/utils/form/form.util";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import { focusFirstSomedaySidebarItem } from "@web/components/PlannerSidebar/util/sidebarFocus.util";
import { useEventMutations } from "@web/events/mutations/useEventMutations";
import { createLegacyEventMutationsAdapter } from "@web/events/queries/event.legacy-bridge";
import { useSomedayEventViewModel } from "@web/events/queries/useSomedayEventsQuery";
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
  type CalendarEventTarget,
  focusCalendarEventTarget,
  getFirstVisibleCalendarEventTarget,
  getFocusedCalendarEventTarget,
  getHoveredCalendarEventTarget,
} from "@web/views/Week/interaction/targeting/weekCalendarEventTargeting";

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
  const { data: calendars } = useCalendarsQuery();
  // TODO(packet-03-phase-3c): legacy-shaped facade until this file's
  // Schema_GridEvent-based someday conversion is converted to the new
  // contracts.
  const { convertToSomeday } = createLegacyEventMutationsAdapter(
    mutations,
    () => getDefaultTargetCalendar(calendars ?? [])?.id,
  );
  const context = useSidebarContext(true);
  const {
    actions: { repositionDraftByKeyboard },
    confirmation,
  } = useDraftContext();
  const { isAtWeeklyLimit, weekCount: somedayWeekCount } =
    useSomedayEventViewModel(startOfView, endOfView);

  const isSidebarOpen = useViewStore(selectIsSidebarOpen);
  const { allDayEvents, timedEvents } = useWeekEventViewModel({
    startOfView,
    endOfView,
  });
  const allDayEventsRef = useRef(allDayEvents);
  const timedEventsRef = useRef(timedEvents);
  const { decrementWeek, incrementWeek, goToToday } = util;
  const { scrollToNow } = scrollUtil;

  useEffect(() => {
    allDayEventsRef.current = allDayEvents;
    timedEventsRef.current = timedEvents;
  }, [allDayEvents, timedEvents]);

  const _createSomedayDraft = useCallback(
    (
      category: Categories_Event.SOMEDAY_WEEK | Categories_Event.SOMEDAY_MONTH,
    ) => {
      void context?.actions.createSomedayDraft(category, "createShortcut");

      // If sidebar is closed, open it first
      if (!isSidebarOpen) {
        viewActions.toggleSidebar();
      }
    },
    [context, isSidebarOpen],
  );

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

  const createAllDayDraftEvent = useCallback(() => {
    void createAlldayDraft(startOfView, endOfView, "createShortcut");
  }, [startOfView, endOfView]);

  const createTimedDraftEvent = useCallback(() => {
    void createTimedDraft(isCurrentWeek, startOfView, "createShortcut");
  }, [isCurrentWeek, startOfView]);

  const createSomedayMonthDraft = useCallback(() => {
    _createSomedayDraft(Categories_Event.SOMEDAY_MONTH);
  }, [_createSomedayDraft]);

  const createSomedayWeekDraft = useCallback(() => {
    _createSomedayDraft(Categories_Event.SOMEDAY_WEEK);
  }, [_createSomedayDraft]);

  const focusSidebar = useCallback(() => {
    if (!isSidebarOpen) {
      viewActions.toggleSidebar();
      // The sidebar renders conditionally; focus after the open commits
      requestAnimationFrame(() => focusFirstSomedaySidebarItem());
      return;
    }

    focusFirstSomedaySidebarItem();
  }, [isSidebarOpen]);

  const focusFirstCalendarEvent = useCallback(() => {
    const target = getFirstVisibleCalendarEventTarget();
    if (!target) return;

    focusCalendarEventTarget(target);
  }, []);

  const findCalendarEventForTarget = useCallback(
    (target: CalendarEventTarget) => {
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
      getFocusedCalendarEventTarget() ??
      getHoveredCalendarEventTarget() ??
      getFirstVisibleCalendarEventTarget();

    if (!target) return null;

    const event = findCalendarEventForTarget(target);
    if (!event) return null;

    return { event, target };
  }, [findCalendarEventForTarget]);

  const editTargetedCalendarEvent = useCallback(() => {
    const resolvedTarget = getTargetedCalendarEvent();
    if (!resolvedTarget) return;

    const { event, target } = resolvedTarget;

    draftActions.start({
      activity: "keyboardEdit",
      event,
      eventType:
        target.eventType === "all-day"
          ? Categories_Event.ALLDAY
          : Categories_Event.TIMED,
    });
  }, [getTargetedCalendarEvent]);

  const deleteTargetedCalendarEvent = useCallback(
    (keyboardEvent: KeyboardEvent) => {
      if (
        isDeleteTextEditingTarget(keyboardEvent) ||
        isEventFormKeyboardTarget(keyboardEvent)
      ) {
        return;
      }

      // Focus inside the sidebar (e.g. via the "u" shortcut) means the user
      // is acting on someday events, not grid events
      if (document.activeElement?.closest(`#${ID_SIDEBAR}`)) {
        return;
      }

      const resolvedTarget = getTargetedCalendarEvent();
      if (!resolvedTarget) {
        return;
      }

      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();

      deleteEventAndDiscardDraft(deleteEvent, resolvedTarget.event);
    },
    [deleteEvent, getTargetedCalendarEvent],
  );

  const convertFocusedEventToSomeday = useCallback(
    (event: Schema_GridEvent) => {
      if (isAtWeeklyLimit) {
        showErrorToast(SOMEDAY_WEEK_LIMIT_MSG);
        return;
      }

      const somedayEvent = buildConvertToSomedayEvent(
        event,
        {
          startDate: startOfView.format(YEAR_MONTH_DAY_FORMAT),
          endDate: endOfView.format(YEAR_MONTH_DAY_FORMAT),
        },
        somedayWeekCount,
      );

      convertToSomeday({ event: somedayEvent });

      if (!isSidebarOpen) {
        viewActions.toggleSidebar();
      }
      refocusEventElement(somedayEvent._id);
    },
    [
      convertToSomeday,
      endOfView,
      isAtWeeklyLimit,
      isSidebarOpen,
      somedayWeekCount,
      startOfView,
    ],
  );

  const moveFocusedCalendarEvent = useCallback(
    (keyboardEvent: KeyboardEvent) => {
      if (isEventFormOpen()) return;

      // Focused only (no hover/first-visible fallback): moving an event the
      // user isn't focused on would be surprising
      const target = getFocusedCalendarEventTarget();
      if (!target) return;

      const event = findCalendarEventForTarget(target);
      if (!event?._id) return;

      const movement = getArrowKeyMovement(
        keyboardEvent.key,
        Boolean(event.isAllDay),
      );
      if (!movement) return;

      const start = dayjs(event.startDate);

      if (movement.days === -1 && !start.isAfter(weekDays[0], "day")) {
        keyboardEvent.preventDefault();
        convertFocusedEventToSomeday(event);
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
        onNudge: (event) => {
          void confirmation.onSubmit(event);
        },
      });
    },
    [
      confirmation,
      convertFocusedEventToSomeday,
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
  useAppShortcutUp("T", toToday);
  useAppShortcutUp("A", createAllDayDraftEvent);
  useAppShortcutUp("C", createTimedDraftEvent);
  useAppShortcutUp("U", focusSidebar);
  useAppShortcutUp("I", focusFirstCalendarEvent);
  useAppShortcutUp("M", editTargetedCalendarEvent);
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
  useAppShortcutUp("Shift+M", createSomedayMonthDraft);
  useAppShortcutUp("Shift+W", createSomedayWeekDraft);
};
