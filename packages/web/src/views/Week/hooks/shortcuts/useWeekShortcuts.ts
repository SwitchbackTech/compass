import { useCallback, useEffect, useRef } from "react";
import { Categories_Event } from "@core/types/event.types";
import { type Dayjs } from "@core/util/date/dayjs";
import { ID_SIDEBAR } from "@web/common/constants/web.constants";
import { useAppHotkey, useAppHotkeyUp } from "@web/common/hotkeys/useAppHotkey";
import {
  createAlldayDraft,
  createTimedDraft,
} from "@web/common/utils/draft/draft.util";
import {
  isDeleteTextEditingTarget,
  isEditableKeyboardTarget,
  isEventFormKeyboardTarget,
  isEventFormOpen,
} from "@web/common/utils/form/form.util";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import { focusFirstSomedaySidebarItem } from "@web/components/PlannerSidebar/util/sidebarFocus.util";
import { useEventMutations } from "@web/events/mutations/useEventMutations";
import { useWeekEventViewModel } from "@web/events/queries/useWeekEventsQuery";
import { draftActions } from "@web/events/stores/draft.store";
import {
  selectIsSidebarOpen,
  useViewStore,
  viewActions,
} from "@web/events/stores/view.store";
import { deleteEventAndDiscardDraft } from "@web/views/Forms/hooks/useDeleteEvent";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";
import { type Util_Scroll } from "@web/views/Week/hooks/grid/useScroll";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import {
  focusCalendarEventTarget,
  getFirstVisibleCalendarEventTarget,
  getFocusedCalendarEventTarget,
  getHoveredCalendarEventTarget,
} from "@web/views/Week/interaction/targeting/weekCalendarEventTargeting";

export interface ShortcutProps {
  isCurrentWeek: boolean;
  startOfView: Dayjs;
  endOfView: Dayjs;
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
  util,
  scrollUtil,
}: ShortcutProps) => {
  const { delete: deleteEvent } = useEventMutations();
  const context = useSidebarContext(true);
  const {
    actions: { repositionDraftByKeyboard },
  } = useDraftContext();

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

  const getTargetedCalendarEvent = useCallback(() => {
    const target =
      getFocusedCalendarEventTarget() ??
      getHoveredCalendarEventTarget() ??
      getFirstVisibleCalendarEventTarget();

    if (!target) return null;

    const events =
      target.eventType === "all-day"
        ? allDayEventsRef.current
        : timedEventsRef.current;
    const event = events.find((candidate) => candidate._id === target.eventId);
    if (!event) return null;

    return { event, target };
  }, []);

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

  useAppHotkeyUp("J", goToPreviousWeek);
  useAppHotkeyUp("K", goToNextWeek);
  useAppHotkeyUp("T", toToday);
  useAppHotkeyUp("A", createAllDayDraftEvent);
  useAppHotkeyUp("C", createTimedDraftEvent);
  useAppHotkeyUp("U", focusSidebar);
  useAppHotkeyUp("I", focusFirstCalendarEvent);
  useAppHotkeyUp("M", editTargetedCalendarEvent);
  useAppHotkey("Delete", deleteTargetedCalendarEvent, {
    ignoreInputs: false,
  });
  useAppHotkey(
    "ArrowUp",
    moveShortcutCreatedDraft,
    DRAFT_MOVEMENT_HOTKEY_OPTIONS,
  );
  useAppHotkey(
    "ArrowDown",
    moveShortcutCreatedDraft,
    DRAFT_MOVEMENT_HOTKEY_OPTIONS,
  );
  useAppHotkey(
    "ArrowLeft",
    moveShortcutCreatedDraft,
    DRAFT_MOVEMENT_HOTKEY_OPTIONS,
  );
  useAppHotkey(
    "ArrowRight",
    moveShortcutCreatedDraft,
    DRAFT_MOVEMENT_HOTKEY_OPTIONS,
  );
  useAppHotkeyUp("Shift+M", createSomedayMonthDraft);
  useAppHotkeyUp("Shift+W", createSomedayWeekDraft);
};
