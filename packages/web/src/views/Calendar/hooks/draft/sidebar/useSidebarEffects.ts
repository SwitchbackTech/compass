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
  selectDraft,
  selectDraftStatus,
  selectIsDrafting,
} from "@web/ducks/events/selectors/draft.selectors";

import { State_Sidebar } from "./useSidebarState";
import { Util_Sidebar } from "./useSidebarUtil";

export const useSidebarEffects = (util: Util_Sidebar) => {
  // const {
  //   // draft,
  //   // draftType,
  //   // isDraftingNew,
  //   // isDraftingRedux,
  //   // somedayIds,
  //   setDraft,
  //   setIsDrafting,
  //   // setIsDraftingExisting,
  // } = state;
  const { close, createDefaultSomeday } = util;

  const { eventType: draftType } = useAppSelector(selectDraftStatus);
  const isAtMonthlyLimit = useAppSelector(selectIsAtMonthlyLimit);
  const isAtWeeklyLimit = useAppSelector(selectIsAtWeeklyLimit);
  // const existingDraft = useAppSelector(selectDraft);
  const isDraftingRedux = useAppSelector(selectIsDrafting);
  // const isDraftingRedux = false;

  // useEffect(() => {
  //   setIsDraftingExisting(somedayIds.includes(draft?._id));
  // }, [draft, somedayIds, setIsDraftingExisting]);

  // useEffect(() => {
  //   console.log("running sidebar effect after draft change...");
  //   if (
  //     isDraftingRedux ||
  //     (draftType !== Categories_Event.SOMEDAY_WEEK &&
  //       draftType !== Categories_Event.SOMEDAY_MONTH)
  //   ) {
  //     console.log("closing...");
  //     setIsDrafting(false);
  //     setDraft(null);
  //   }
  // }, [draftType, isDraftingRedux, setDraft, setIsDrafting]);

  const handleSomedayTrigger = useCallback(() => {
    console.log("in sidebar effect after draftType:", draftType);
    if (!isDraftingRedux) {
      console.log("not drafting, closing");
      close();
      return;
    }

    if (
      draftType !== Categories_Event.SOMEDAY_WEEK &&
      draftType !== Categories_Event.SOMEDAY_MONTH
    ) {
      console.log("not a someday draft, closing...");
      close();
      return;
    }
    // const isNewDraft = isDraftingRedux && !isDraftingNew;
    // if (!isNewDraft) console.log("not a new draft, returning...");
    // if (!isNewDraft) return;

    // const isDraftingExisting = isDraftingRedux === false && !isDraftingNew;
    // const notDrafting = isDraftingRedux === false;

    // if (!isDraftingRedux) {
    //   console.log("not drafting, ignoring");
    //   return;
    // }

    // if (!isDraftingRedux) {
    //   console.log("redux draft gone, closing local state too... ");
    //   close();
    //   return;
    // }

    // if (existingDraft) {
    //   console.log("existing draft");
    //   // setIsDrafting(true);
    //   // setDraft({
    //   //   ...existingDraft,
    //   //   isOpen: true,
    //   // });
    //   return;
    // }

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
