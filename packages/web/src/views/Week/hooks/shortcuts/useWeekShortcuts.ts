import { useCallback, useEffect, useRef } from "react";
import { Categories_Event } from "@core/types/event.types";
import { type Dayjs } from "@core/util/date/dayjs";
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
import {
  selectAllDayEvents,
  selectGridEvents,
} from "@web/ducks/events/selectors/event.selectors";
import { selectPendingEventIds } from "@web/ducks/events/selectors/pending.selectors";
import { selectIsSidebarOpen } from "@web/ducks/events/selectors/view.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { confirmAndDeleteEvent } from "@web/views/Forms/hooks/useDeleteEvent";
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
  const dispatch = useAppDispatch();
  const context = useSidebarContext(true);
  const {
    actions: { repositionDraftByKeyboard },
  } = useDraftContext();

  const isSidebarOpen = useAppSelector(selectIsSidebarOpen);
  const allDayEvents = useAppSelector(selectAllDayEvents);
  const pendingEventIds = useAppSelector(selectPendingEventIds);
  const timedEvents = useAppSelector(selectGridEvents);
  const allDayEventsRef = useRef(allDayEvents);
  const pendingEventIdsRef = useRef(pendingEventIds);
  const timedEventsRef = useRef(timedEvents);
  const { decrementWeek, incrementWeek, goToToday } = util;
  const { scrollToNow } = scrollUtil;

  useEffect(() => {
    allDayEventsRef.current = allDayEvents;
    pendingEventIdsRef.current = pendingEventIds;
    timedEventsRef.current = timedEvents;
  }, [allDayEvents, pendingEventIds, timedEvents]);

  const _createSomedayDraft = useCallback(
    (
      category: Categories_Event.SOMEDAY_WEEK | Categories_Event.SOMEDAY_MONTH,
    ) => {
      void context?.actions.createSomedayDraft(category, "createShortcut");

      // If sidebar is closed, open it first
      if (!isSidebarOpen) {
        dispatch(viewSlice.actions.toggleSidebar());
      }
    },
    [context, isSidebarOpen, dispatch],
  );

  const _discardDraft = useCallback(() => {
    if (isEventFormOpen()) {
      dispatch(draftSlice.actions.discard(undefined));
    }
  }, [dispatch]);

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

  const openSidebar = useCallback(
    () => dispatch(viewSlice.actions.toggleSidebar()),
    [dispatch],
  );

  const createAllDayDraftEvent = useCallback(() => {
    void createAlldayDraft(startOfView, endOfView, "createShortcut", dispatch);
  }, [dispatch, startOfView, endOfView]);

  const createTimedDraftEvent = useCallback(() => {
    void createTimedDraft(
      isCurrentWeek,
      startOfView,
      "createShortcut",
      dispatch,
    );
  }, [isCurrentWeek, startOfView, dispatch]);

  const createSomedayMonthDraft = useCallback(() => {
    _createSomedayDraft(Categories_Event.SOMEDAY_MONTH);
  }, [_createSomedayDraft]);

  const createSomedayWeekDraft = useCallback(() => {
    _createSomedayDraft(Categories_Event.SOMEDAY_WEEK);
  }, [_createSomedayDraft]);

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
    if (pendingEventIdsRef.current.includes(target.eventId)) return null;

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

    dispatch(
      draftSlice.actions.start({
        activity: "keyboardEdit",
        event,
        eventType:
          target.eventType === "all-day"
            ? Categories_Event.ALLDAY
            : Categories_Event.TIMED,
      }),
    );
  }, [dispatch, getTargetedCalendarEvent]);

  const deleteTargetedCalendarEvent = useCallback(
    (keyboardEvent: KeyboardEvent) => {
      if (
        isDeleteTextEditingTarget(keyboardEvent) ||
        isEventFormKeyboardTarget(keyboardEvent)
      ) {
        return;
      }

      const resolvedTarget = getTargetedCalendarEvent();
      if (!resolvedTarget) {
        return;
      }

      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();

      confirmAndDeleteEvent({
        dispatch,
        existingEvent: resolvedTarget.event,
      });
    },
    [dispatch, getTargetedCalendarEvent],
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

  useAppHotkeyUp("[", openSidebar);
  useAppHotkeyUp("J", goToPreviousWeek);
  useAppHotkeyUp("K", goToNextWeek);
  useAppHotkeyUp("T", toToday);
  useAppHotkeyUp("A", createAllDayDraftEvent);
  useAppHotkeyUp("C", createTimedDraftEvent);
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
