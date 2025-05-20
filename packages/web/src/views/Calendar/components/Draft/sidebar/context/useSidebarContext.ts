import { useContext } from "react";
import { SidebarDraftContext } from "./SidebarDraftContext";

export const useSidebarContext = (suppressContextError = false) => {
  const context = useContext(SidebarDraftContext);
  if (!context) {
    if (suppressContextError) {
      return null;
    }
    throw new Error(
      "useSidebarContext must be used within SidebarDraftProvider",
    );
  }
  return context;
};
