import { type ReactNode } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { useSidebarActions } from "../hooks/useSidebarActions";
import { useSidebarEffects } from "../hooks/useSidebarEffects";
import { useSidebarState } from "../hooks/useSidebarState";
import { SidebarDraftContext } from "./SidebarDraftContext";

interface Props {
  children: ReactNode;
  onGoToDate: (date: Dayjs) => void;
  viewEnd: Dayjs;
  viewStart: Dayjs;
}
export const SidebarDraftProvider = ({
  children,
  onGoToDate,
  viewEnd,
  viewStart,
}: Props) => {
  const { setters, state } = useSidebarState();
  const actions = useSidebarActions(
    {
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
