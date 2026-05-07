import { type ReactNode } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { useSidebarActions } from "../hooks/useSidebarActions";
import { useSidebarEffects } from "../hooks/useSidebarEffects";
import { useSidebarState } from "../hooks/useSidebarState";
import { SidebarDraftContext } from "./SidebarDraftContext";

interface Props {
  children: ReactNode;
  dateCalcs?: DateCalcs;
  onGoToDate: (date: Dayjs) => void;
  viewEnd: Dayjs;
  viewStart: Dayjs;
}
export const SidebarDraftProvider = ({
  children,
  dateCalcs,
  onGoToDate,
  viewEnd,
  viewStart,
}: Props) => {
  const { setters, state } = useSidebarState();
  const actions = useSidebarActions(
    {
      dateCalcs,
      onGoToDate,
      viewEnd,
      viewStart,
    },
    state,
    setters,
  );
  useSidebarEffects(state, actions);

  return (
    <SidebarDraftContext.Provider value={{ state, setters, actions }}>
      {children}
    </SidebarDraftContext.Provider>
  );
};
