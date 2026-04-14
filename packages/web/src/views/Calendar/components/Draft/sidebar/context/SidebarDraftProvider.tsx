import { type DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { type WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { type ReactNode } from "react";
import { useSidebarActions } from "../hooks/useSidebarActions";
import { useSidebarEffects } from "../hooks/useSidebarEffects";
import { useSidebarState } from "../hooks/useSidebarState";
import { SidebarDraftContext } from "./SidebarDraftContext";

interface Props {
  children: ReactNode;
  dateCalcs: DateCalcs;
  weekProps: WeekProps;
}
export const SidebarDraftProvider = ({
  children,
  dateCalcs,
  weekProps,
}: Props) => {
  const { setters, state } = useSidebarState();
  const actions = useSidebarActions(dateCalcs, state, setters, weekProps);
  useSidebarEffects(state, actions);

  return (
    <SidebarDraftContext.Provider value={{ state, setters, actions }}>
      {children}
    </SidebarDraftContext.Provider>
  );
};
