import { useEffect } from "react";
import { selectIsDNDing, useDraftStore } from "@web/events/stores/draft.store";
import { type Actions_Sidebar } from "./useSidebarActions";
import { type State_Sidebar } from "./useSidebarState";

export const useSidebarEffects = (
  state: State_Sidebar,
  actions: Actions_Sidebar,
) => {
  const isDNDing = useDraftStore(selectIsDNDing);
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
