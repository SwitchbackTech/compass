import { useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useNavigate } from "react-router-dom";
import { Key } from "ts-keycode-enum";
import {
  SOMEDAY_MONTH_LIMIT_MSG,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";
import { Categories_Event } from "@core/types/event.types";
import { Dayjs } from "@core/util/date/dayjs";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { ID_REMINDER_INPUT } from "@web/common/constants/web.constants";
import {
  createAlldayDraft,
  createTimedDraft,
} from "@web/common/utils/draft/draft.util";
import { isEventFormOpen } from "@web/common/utils/form/form.util";
import {
  selectIsAtMonthlyLimit,
  selectIsAtWeeklyLimit,
} from "@web/ducks/events/selectors/someday.selectors";
import {
  selectIsSidebarOpen,
  selectSidebarTab,
} from "@web/ducks/events/selectors/view.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { useSidebarContext } from "@web/views/Calendar/components/Draft/sidebar/context/useSidebarContext";
import { DateCalcs } from "../grid/useDateCalcs";
import { Util_Scroll } from "../grid/useScroll";
import { WeekProps } from "../useWeek";

export interface ShortcutProps {
  today: Dayjs;
  dateCalcs: DateCalcs;
  isCurrentWeek: boolean;
  startOfView: Dayjs;
  endOfView: Dayjs;
  util: WeekProps["util"];
  scrollUtil: Util_Scroll;
}

export const useShortcuts = ({
  today,
  dateCalcs,
  isCurrentWeek,
  startOfView,
  endOfView,
  util,
  scrollUtil,
}: ShortcutProps) => {
  const dispatch = useAppDispatch();
  const context = useSidebarContext(true);
  const navigate = useNavigate();

  const isAtMonthlyLimit = useAppSelector(selectIsAtMonthlyLimit);
  const isAtWeeklyLimit = useAppSelector(selectIsAtWeeklyLimit);
  const tab = useAppSelector(selectSidebarTab);
  const isSidebarOpen = useAppSelector(selectIsSidebarOpen);

  useHotkeys("shift+1", () => {
    dispatch(viewSlice.actions.updateSidebarTab("tasks"));
  });
  useHotkeys("shift+2", () => {
    dispatch(viewSlice.actions.updateSidebarTab("monthWidget"));
  });

  useEffect(() => {
    const _createSomedayDraft = async (
      category: Categories_Event.SOMEDAY_WEEK | Categories_Event.SOMEDAY_MONTH,
    ) => {
      if (category === Categories_Event.SOMEDAY_WEEK && isAtWeeklyLimit) {
        alert(SOMEDAY_WEEK_LIMIT_MSG);
        return;
      }
      if (category === Categories_Event.SOMEDAY_MONTH && isAtMonthlyLimit) {
        alert(SOMEDAY_MONTH_LIMIT_MSG);
        return;
      }

      context?.actions.createSomedayDraft(category, "createShortcut");

      // If sidebar is closed, open it first
      if (!isSidebarOpen) {
        dispatch(viewSlice.actions.toggleSidebar());
      }

      if (tab !== "tasks") {
        dispatch(viewSlice.actions.updateSidebarTab("tasks"));
      }
    };

    const _discardDraft = () => {
      if (isEventFormOpen()) {
        dispatch(draftSlice.actions.discard());
      }
    };

    const keyDownHandler = (e: KeyboardEvent) => {
      // Prevent shortcuts from triggering unexpectedly
      if (isEventFormOpen()) return;

      const isEditingHeader =
        document.getElementById(ID_REMINDER_INPUT) !== null;
      if (isEditingHeader) return;

      const isCmdPaletteOpen =
        document.getElementById("headlessui-portal-root") !== null;
      if (isCmdPaletteOpen) return;

      if (e.metaKey) return;

      // map shortcuts to handler
      const handlersByKey = {
        [Key.OpenBracket]: () => dispatch(viewSlice.actions.toggleSidebar()),
        [Key.C]: () =>
          createTimedDraft(
            isCurrentWeek,
            startOfView,
            "createShortcut",
            dispatch,
          ),
        [Key.A]: () => {
          createAlldayDraft(startOfView, endOfView, "createShortcut", dispatch);
        },
        [Key.T]: () => {
          scrollUtil.scrollToNow();
          _discardDraft();
          util.goToToday();
        },
        [Key.J]: () => {
          _discardDraft();
          util.decrementWeek();
        },
        [Key.K]: () => {
          _discardDraft();
          util.incrementWeek();
        },
        [Key.M]: () => _createSomedayDraft(Categories_Event.SOMEDAY_MONTH),
        [Key.W]: () => _createSomedayDraft(Categories_Event.SOMEDAY_WEEK),
        [Key.Z]: () => {
          navigate(ROOT_ROUTES.LOGOUT);
        },
      } as { [key: number]: () => void };

      const handler = handlersByKey[e.which];
      if (!handler) return;

      setTimeout(handler);
    };

    document.addEventListener("keydown", keyDownHandler);

    return () => {
      document.removeEventListener("keydown", keyDownHandler);
    };
  }, [
    dateCalcs,
    dispatch,
    today,
    isAtMonthlyLimit,
    isAtWeeklyLimit,
    isCurrentWeek,
    navigate,
    startOfView,
    endOfView,
    scrollUtil,
    util,
    tab,
    context,
    isSidebarOpen,
  ]);
};
