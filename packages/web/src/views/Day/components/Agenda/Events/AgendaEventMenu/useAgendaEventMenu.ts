import { useMemo, useState } from "react";
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
    enabled: controlledOpen === undefined,
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
