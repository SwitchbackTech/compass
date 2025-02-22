import React from "react";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { useDraftActions } from "../hooks/actions/useDraftActions";
import { useDraftForm } from "../hooks/state/useDraftForm";
import { useDraftState } from "../hooks/state/useDraftState";
import { DraftContext, State_Draft_Combined } from "./DraftContext";

interface DraftProviderProps {
  children: React.ReactNode;
  dateCalcs: DateCalcs;
  weekProps: WeekProps;
  isSidebarOpen: boolean;
}
export const DraftProvider = ({
  children,
  dateCalcs,
  weekProps,
  isSidebarOpen,
}: DraftProviderProps) => {
  const { state: originalState, setters } = useDraftState();
  const actions = useDraftActions(
    originalState,
    setters,
    dateCalcs,
    weekProps,
    isSidebarOpen,
  );
  const { discard, reset } = actions;
  const { isFormOpen } = originalState;
  const { setIsFormOpen } = setters;
  const formProps = useDraftForm(isFormOpen, discard, reset, setIsFormOpen);

  const state: State_Draft_Combined = {
    ...originalState,
    formProps,
  };

  return (
    <DraftContext.Provider value={{ state, setters, actions }}>
      {children}
    </DraftContext.Provider>
  );
};
