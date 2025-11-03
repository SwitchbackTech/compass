import { createContext } from "react";
import { useAgendaEventMenu } from "../useAgendaEventMenu";

type AgendaEventMenuHookContext = ReturnType<typeof useAgendaEventMenu> | null;

export const AgendaEventMenuContext =
  createContext<AgendaEventMenuHookContext>(null);
