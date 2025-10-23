import { createContext, useContext, useMemo, useState } from "react";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from "@floating-ui/react";

export interface AgendaEventMenuOptions {
  initialOpen?: boolean;
  placement?: "right" | "left";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function useAgendaEventMenu({
  initialOpen = false,
  placement = "right",
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: AgendaEventMenuOptions = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(initialOpen);

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = setControlledOpen ?? setUncontrolledOpen;

  const data = useFloating({
    placement,
    open,
    onOpenChange: setOpen,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip({
        fallbackAxisSideDirection: "start",
        crossAxis: placement.includes("-"),
      }),
      shift({ padding: 8 }),
    ],
  });

  const context = data.context;

  const hover = useHover(context, {
    delay: 120,
    enabled: true,
  });
  const focus = useFocus(context, {
    enabled: controlledOpen == null,
  });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const interactions = useInteractions([hover, focus, dismiss, role]);

  return useMemo(
    () => ({
      open,
      setOpen,
      ...interactions,
      ...data,
    }),
    [open, setOpen, interactions, data],
  );
}

export const AgendaEventMenuContext =
  createContext<AgendaEventMenuHookContext>(null);
export const useAgendaEventMenuContext = () => {
  const context = useContext(AgendaEventMenuContext);

  if (context == null) {
    throw new Error(
      "AgendaEventMenu components must be wrapped in <AgendaEventMenu />",
    );
  }

  return context;
};

export type AgendaEventMenuHookContext = ReturnType<
  typeof useAgendaEventMenu
> | null;
