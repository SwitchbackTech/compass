import React from "react";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { useDraftActions } from "../hooks/actions/useDraftActions";
import { useDraftState } from "../hooks/state/useDraftState";
import { DraftContext } from "./DraftContext";

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
  const { state, setters } = useDraftState();
  const actions = useDraftActions(
    state,
    setters,
    dateCalcs,
    weekProps,
    isSidebarOpen,
  );

  return (
    <DraftContext.Provider value={{ state, setters, actions }}>
      {children}
    </DraftContext.Provider>
  );
};
