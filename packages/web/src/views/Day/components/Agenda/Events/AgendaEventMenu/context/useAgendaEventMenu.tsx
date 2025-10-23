import { useContext } from "react";
import { AgendaEventMenuContext } from "./AgendaEventMenuContext";

export const useAgendaEventMenu = () => {
  const context = useContext(AgendaEventMenuContext);

  if (context == null) {
    throw new Error(
      "AgendaEventMenu components must be wrapped in <AgendaEventMenu />",
    );
  }

  return context;
};
