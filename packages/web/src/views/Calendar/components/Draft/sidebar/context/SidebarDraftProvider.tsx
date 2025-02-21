import React, { ReactNode } from "react";
import { useSidebarActions } from "../hooks/useSidebarActions";
import { useSidebarState } from "../hooks/useSidebarState";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { SidebarDraftContext } from "./SidebarDraftContext";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
interface Props {
  children: ReactNode;
  dateCalcs: DateCalcs;
  measurements: Measurements_Grid;
}
export const SidebarDraftProvider = ({
  children,
  dateCalcs,
  measurements,
}: Props) => {
  const { setters, state } = useSidebarState(measurements);
  const actions = useSidebarActions(dateCalcs, state, setters);

  return (
    <SidebarDraftContext.Provider value={{ state, setters, actions }}>
      {children}
    </SidebarDraftContext.Provider>
  );
};
