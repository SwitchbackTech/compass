import { useCallback, useEffect, useState } from "react";
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
  selectDraft,
  selectDraftStatus,
  selectIsDrafting,
  selectIsDraftingExisting,
} from "@web/ducks/events/selectors/draft.selectors";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { getDefaultEvent } from "@web/common/utils/event.util";

import { Util_Sidebar } from "./useSidebarUtil";

export const useSidebarEffects = (util: Util_Sidebar) => {
  const { close, resetLocalDraftStateIfNeeded, createDefaultSomeday } = util;

  const { eventType: draftType } = useAppSelector(selectDraftStatus);
  const isAtMonthlyLimit = useAppSelector(selectIsAtMonthlyLimit);
  const isAtWeeklyLimit = useAppSelector(selectIsAtWeeklyLimit);
  const isDraftingRedux = useAppSelector(selectIsDrafting);
  const isDraftingExisting = useAppSelector(selectIsDraftingExisting);

  /*
  useEffect(() => {
    // const isGridDraft =
    //   draftType !== Categories_Event.SOMEDAY_WEEK &&
    //   draftType !== Categories_Event.SOMEDAY_MONTH;

    const isGridDraft = false;
    if (isGridDraft) {
      console.log("TODO closing sidebar draft so it doesn't get stale");
      // close();
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
  }, [
    // isDraftingRedux,
    draftType,
    // resetLocalDraftStateIfNeeded,
    // setShouldTriggerDraft,
    // close,
    isAtWeeklyLimit,
    isAtMonthlyLimit,
  ]);
  */

  useEffect(() => {
    if (!isDraftingRedux) {
      resetLocalDraftStateIfNeeded();
    }
    // also check if the drafttype changed
  }, [isDraftingRedux, resetLocalDraftStateIfNeeded]);

  useEffect(() => {
    const shouldStartNew = isDraftingRedux && !isDraftingExisting;
    if (shouldStartNew) {
      console.log("creating new default...");
      createDefaultSomeday();
    }
  }, [isDraftingExisting, isDraftingRedux, createDefaultSomeday]);
};
