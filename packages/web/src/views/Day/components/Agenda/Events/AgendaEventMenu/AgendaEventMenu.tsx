import React from "react";
import { AgendaEventMenuContext } from "./context/AgendaEventMenuContext";
import { useAgendaEventMenu } from "./useAgendaEventMenu";

export function AgendaEventMenu({
  children,
  ...options
}: { children: React.ReactNode } & Parameters<typeof useAgendaEventMenu>[0]) {
  const menu = useAgendaEventMenu(options);
  return (
    <AgendaEventMenuContext.Provider value={menu}>
      {children}
    </AgendaEventMenuContext.Provider>
  );
}
