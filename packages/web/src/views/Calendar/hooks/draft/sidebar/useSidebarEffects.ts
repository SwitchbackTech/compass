import { useEffect } from "react";
import { useAppSelector } from "@web/store/store.hooks";
import {
  selectIsAtMonthlyLimit,
  selectIsAtWeeklyLimit,
} from "@web/ducks/events/selectors/someday.selectors";
import {
  selectIsDrafting,
  selectIsDraftingExisting,
  selectIsDraftingSomeday,
} from "@web/ducks/events/selectors/draft.selectors";

import { Util_Sidebar } from "./useSidebarUtil";

export const useSidebarEffects = (util: Util_Sidebar) => {
  const { resetLocalDraftStateIfNeeded, createDefaultSomeday } = util;

  const isAtMonthlyLimit = useAppSelector(selectIsAtMonthlyLimit);
  const isAtWeeklyLimit = useAppSelector(selectIsAtWeeklyLimit);
  const isDraftingRedux = useAppSelector(selectIsDrafting);
  const isDraftingExisting = useAppSelector(selectIsDraftingExisting);
  const isDraftingSomeday = useAppSelector(selectIsDraftingSomeday);

  useEffect(() => {
    const isSidebarStatePotentiallyStale = !isDraftingSomeday;
    if (isSidebarStatePotentiallyStale) {
      resetLocalDraftStateIfNeeded();
    }
  }, [isDraftingSomeday, resetLocalDraftStateIfNeeded]);

  useEffect(() => {
    const shouldStartNew = isDraftingRedux && !isDraftingExisting;
    if (shouldStartNew) {
      createDefaultSomeday();
    }
  }, [isDraftingExisting, isDraftingRedux, createDefaultSomeday]);
};
