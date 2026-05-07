import { createContext } from "react";
import { type Actions_Sidebar } from "../hooks/useSidebarActions";
import {
  type Setters_Sidebar,
  type State_Sidebar,
} from "../hooks/useSidebarState";

export interface SidebarDraftContextValue {
  state: State_Sidebar;
  setters: Setters_Sidebar;
  actions: Actions_Sidebar;
}
export const SidebarDraftContext =
  createContext<SidebarDraftContextValue | null>(null);
