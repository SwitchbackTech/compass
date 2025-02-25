import { useEffect } from "react";
import { selectIsDNDing } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { Actions_Sidebar } from "./useSidebarActions";
import { State_Sidebar } from "./useSidebarState";

export const useSidebarEffects = (
  state: State_Sidebar,
  actions: Actions_Sidebar,
) => {
  const isDNDing = useAppSelector(selectIsDNDing);

  useEffect(() => {
    if (isDNDing && state.isSomedayFormOpen) {
      actions.closeForm();
    }
  }, [isDNDing, state.isSomedayFormOpen, actions]);
};
