import { useContext } from "react";
import { SidebarDraftContext } from "./SidebarDraftContext";

export const useSidebarContext = () => {
  const context = useContext(SidebarDraftContext);
  if (!context) {
    throw new Error(
      "useSidebarContext must be used within SidebarDraftProvider",
    );
  }
  return context;
};
