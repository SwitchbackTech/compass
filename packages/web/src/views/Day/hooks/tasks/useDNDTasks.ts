import { useContext } from "react";
import { DNDTasksContext } from "@web/views/Day/context/DNDTasksContext";

export function useDNDTasksContext() {
  const context = useContext(DNDTasksContext);

  if (!context) {
    throw new Error("useDNDTasksContext must be used within DNDTasksProvider");
  }

  return context;
}
