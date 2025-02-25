import { createContext } from "react";
import { Actions_Sidebar } from "../hooks/useSidebarActions";
import { Setters_Sidebar, State_Sidebar } from "../hooks/useSidebarState";

interface SidebarDraftContextValue {
  state: State_Sidebar;
  setters: Setters_Sidebar;
  actions: Actions_Sidebar;
}
export const SidebarDraftContext =
  createContext<SidebarDraftContextValue | null>(null);
