import { useCallback, useEffect } from "react";
import { Categories_Event } from "@core/types/event.types";
import {
  SOMEDAY_MONTH_LIMIT_MSG,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch } from "@web/store/store.hooks";

import { State_Sidebar } from "./useSidebarState";
import { Util_Sidebar } from "./useSidebarUtil";

export const useSidebarEffects = (state: State_Sidebar, util: Util_Sidebar) => {
  const dispatch = useAppDispatch();

  const {
    draft,
    draftType,
    existingIds,
    isAtWeeklyLimit,
    isAtMonthlyLimit,
    // isDraftingNew,
    isDraftingNewWeekly,
    isDraftingRedux,
    isDraftingWeeklySomeday,
    setDraft,
    setIsDrafting,
    setIsDraftingExisting,
  } = state;
  const { createDefaultSomeday } = util;

  useEffect(() => {
    setIsDraftingExisting(existingIds.includes(draft?._id));
  }, [draft, existingIds, setIsDraftingExisting]);

  useEffect(() => {
    if (
      !isDraftingRedux ||
      (draftType !== Categories_Event.SOMEDAY_WEEK &&
        draftType !== Categories_Event.SOMEDAY_MONTH)
    ) {
      setIsDrafting(false);
      setDraft(null);
    }
  }, [draftType, isDraftingRedux, setDraft, setIsDrafting]);

  // useEffect(() => {
  //   // if (isDraftingNew) {
  //   if (isDraftingNewWeekly) {
  //     console.log("should be drafting [effect]");
  //     dispatch(
  //       draftSlice.actions.start({
  //         eventType: draftType,
  //       })
  //     );
  //   }
  // }, [dispatch, draftType, isDraftingNewWeekly]);
  // }, [dispatch, isDraftingNewWeekly]);

  //++
  // useEffect(() => {
  //   if (isDraftingWeeklySomeday) {
  //     console.log("should be drafting [effect]");
  //     dispatch(
  //       draftSlice.actions.start({
  //         eventType: Categories_Event.SOMEDAY_WEEK,
  //       })
  //     );
  //   }
  // }, [dispatch, isDraftingWeeklySomeday]);

  const handleSomedayTrigger = useCallback(() => {
    const isNewDraft = isDraftingRedux && !isDraftingWeeklySomeday;
    if (!isNewDraft) return;

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

    createDefaultSomeday();
  }, [
    createDefaultSomeday,
    draftType,
    isDraftingWeeklySomeday,
    isDraftingRedux,
    isAtMonthlyLimit,
    isAtWeeklyLimit,
  ]);

  useEffect(() => {
    handleSomedayTrigger();
  }, [handleSomedayTrigger]);
};
