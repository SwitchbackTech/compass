import { useCallback } from "react";
import { Categories_Event } from "@core/types/event.types";
import { type Dayjs } from "@core/util/date/dayjs";
import { useAppHotkeyUp } from "@web/common/hooks/useAppHotkey";
import {
  createAlldayDraft,
  createTimedDraft,
} from "@web/common/utils/draft/draft.util";
import { isEventFormOpen } from "@web/common/utils/form/form.util";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import { selectIsSidebarOpen } from "@web/ducks/events/selectors/view.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { type Util_Scroll } from "@web/views/Week/hooks/grid/useScroll";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";

export interface ShortcutProps {
  today: Dayjs;
  dateCalcs: DateCalcs;
  isCurrentWeek: boolean;
  startOfView: Dayjs;
  endOfView: Dayjs;
  util: WeekProps["util"];
  scrollUtil: Util_Scroll;
}

export const useWeekShortcuts = ({
  isCurrentWeek,
  startOfView,
  endOfView,
  util,
  scrollUtil,
}: ShortcutProps) => {
  const dispatch = useAppDispatch();
  const context = useSidebarContext(true);

  const isSidebarOpen = useAppSelector(selectIsSidebarOpen);
  const { decrementWeek, incrementWeek, goToToday } = util;
  const { scrollToNow } = scrollUtil;

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

  useAppHotkeyUp("[", openSidebar);
  useAppHotkeyUp("J", goToPreviousWeek);
  useAppHotkeyUp("K", goToNextWeek);
  useAppHotkeyUp("T", toToday);
  useAppHotkeyUp("A", createAllDayDraftEvent);
  useAppHotkeyUp("C", createTimedDraftEvent);
  useAppHotkeyUp("Shift+M", createSomedayMonthDraft);
  useAppHotkeyUp("Shift+W", createSomedayWeekDraft);
};
