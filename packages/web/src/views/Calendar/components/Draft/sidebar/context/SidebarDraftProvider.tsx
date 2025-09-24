import React, { ReactNode } from "react";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { useSidebarActions } from "../hooks/useSidebarActions";
import { useSidebarEffects } from "../hooks/useSidebarEffects";
import { useSidebarState } from "../hooks/useSidebarState";
import { SidebarDraftContext } from "./SidebarDraftContext";

interface Props {
  children: ReactNode;
  dateCalcs: DateCalcs;
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}
export const SidebarDraftProvider = ({
  children,
  dateCalcs,
  measurements,
  weekProps,
}: Props) => {
  const { setters, state } = useSidebarState(measurements);
  const actions = useSidebarActions(dateCalcs, state, setters, weekProps);
  useSidebarEffects(state, actions);

  return (
    <SidebarDraftContext.Provider value={{ state, setters, actions }}>
      {children}
    </SidebarDraftContext.Provider>
  );
};
