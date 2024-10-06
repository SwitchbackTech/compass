import { useCallback, useEffect } from "react";
import { Categories_Event } from "@core/types/event.types";
import {
  SOMEDAY_MONTH_LIMIT_MSG,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";
import { useAppSelector } from "@web/store/store.hooks";
import {
  selectIsAtMonthlyLimit,
  selectIsAtWeeklyLimit,
} from "@web/ducks/events/selectors/someday.selectors";
import {
  selectDraftStatus,
  selectIsDrafting,
} from "@web/ducks/events/selectors/draft.selectors";

import { Util_Sidebar } from "./useSidebarUtil";

export const useSidebarEffects = (util: Util_Sidebar) => {
  const { close, resetLocalDraftState, createDefaultSomeday } = util;

  const { eventType: draftType } = useAppSelector(selectDraftStatus);
  const isAtMonthlyLimit = useAppSelector(selectIsAtMonthlyLimit);
  const isAtWeeklyLimit = useAppSelector(selectIsAtWeeklyLimit);
  const isDraftingRedux = useAppSelector(selectIsDrafting);

  const handleSomedayTrigger = useCallback(() => {
    if (!isDraftingRedux) {
      console.log("resetting local draft state");
      // close();
      resetLocalDraftState();
      return;
    }
    console.log("drafting ", draftType);

    const isGridDraft =
      draftType !== Categories_Event.SOMEDAY_WEEK &&
      draftType !== Categories_Event.SOMEDAY_MONTH;

    if (isGridDraft) {
      console.log("closing sidebar draft so it doesn't get stale");
      close();
      return;
    }

    if (draftType === Categories_Event.SOMEDAY_WEEK) {
      if (isAtWeeklyLimit) {
        alert(SOMEDAY_WEEK_LIMIT_MSG);
        return;
      }
    } else if (draftType === Categories_Event.SOMEDAY_MONTH) {
      if (isAtMonthlyLimit) {
        alert(SOMEDAY_MONTH_LIMIT_MSG);
        return;
      }
    }

    //TODO enable this to get shortcuts to work
    // createDefaultSomeday();
  }, [isDraftingRedux, draftType, close, isAtWeeklyLimit, isAtMonthlyLimit]);

  useEffect(() => {
    handleSomedayTrigger();
  }, [handleSomedayTrigger]);
};
