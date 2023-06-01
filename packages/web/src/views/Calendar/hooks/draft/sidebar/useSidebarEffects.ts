import { useCallback, useEffect } from "react";
import { Categories_Event } from "@core/types/event.types";
import {
  SOMEDAY_MONTH_LIMIT_MSG,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";

import { State_Sidebar } from "./useSidebarState";
import { Util_Sidebar } from "./useSidebarUtil";

export const useSidebarEffects = (state: State_Sidebar, util: Util_Sidebar) => {
  const {
    draft,
    draftType,
    somedayWeekIds: existingIds,
    isAtWeeklyLimit,
    isAtMonthlyLimit,
    isDraftingNewWeekly,
    isDraftingRedux,
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

  const handleSomedayTrigger = useCallback(() => {
    const isNewDraft = isDraftingRedux && !isDraftingNewWeekly;
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
    isDraftingRedux,
    isDraftingNewWeekly,
    draftType,
    createDefaultSomeday,
    isAtWeeklyLimit,
    isAtMonthlyLimit,
  ]);

  useEffect(() => {
    handleSomedayTrigger();
  }, [handleSomedayTrigger]);
};
