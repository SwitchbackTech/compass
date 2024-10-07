import { useEffect } from "react";
import { useAppSelector } from "@web/store/store.hooks";
import {
  selectIsDrafting,
  selectIsDraftingExisting,
  selectIsDraftingSomeday,
} from "@web/ducks/events/selectors/draft.selectors";

import { Util_Sidebar } from "./useSidebarUtil";

export const useSidebarEffects = (util: Util_Sidebar) => {
  const { resetLocalDraftStateIfNeeded, createDefaultSomeday } = util;

  const isDrafting = useAppSelector(selectIsDrafting);
  const isDraftingExisting = useAppSelector(selectIsDraftingExisting);
  const isDraftingSomeday = useAppSelector(selectIsDraftingSomeday);

  useEffect(() => {
    const isSidebarStatePotentiallyStale = !isDraftingSomeday;
    if (isSidebarStatePotentiallyStale) {
      resetLocalDraftStateIfNeeded();
    }
  }, [isDraftingSomeday, resetLocalDraftStateIfNeeded]);

  useEffect(() => {
    const shouldStartNew = isDrafting && !isDraftingExisting;
    if (shouldStartNew) {
      createDefaultSomeday();
    }
  }, [isDraftingExisting, isDrafting, createDefaultSomeday]);
};
