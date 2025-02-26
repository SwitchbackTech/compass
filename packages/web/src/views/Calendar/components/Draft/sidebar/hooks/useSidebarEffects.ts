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
  const { closeForm, handleChange } = actions;

  useEffect(() => {
    handleChange();
  }, [handleChange]);

  useEffect(() => {
    if (isDNDing && state.isSomedayFormOpen) {
      closeForm();
    }
  }, [isDNDing, state.isSomedayFormOpen, closeForm]);
};
