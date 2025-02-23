import { createContext } from "react";
import { useDraftForm } from "../../hooks/state/useDraftForm";
import { Actions_Sidebar } from "../hooks/useSidebarActions";
import { Setters_Sidebar, State_Sidebar_Local } from "../hooks/useSidebarState";

export type Props_SidebarForm = ReturnType<typeof useDraftForm>;

export interface State_Sidebar extends State_Sidebar_Local {
  formProps: Props_SidebarForm;
}

interface SidebarDraftContextValue {
  state: State_Sidebar;
  setters: Setters_Sidebar;
  actions: Actions_Sidebar;
}
export const SidebarDraftContext =
  createContext<SidebarDraftContextValue | null>(null);
