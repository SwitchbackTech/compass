import { useContext } from "react";
import { DNDTasksContext } from "@web/views/Day/context/DNDTasksProvider";

export function useDNDTasksContext() {
  const context = useContext(DNDTasksContext);

  if (!context) {
    throw new Error(
      "useDNDTasksContext must be used within useDNDTasksProvider",
    );
  }

  return context;
}
