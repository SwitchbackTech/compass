import {
  autoUpdate,
  flip,
  offset,
  OpenChangeReason,
  shift,
  useDismiss,
  useFloating,
  UseFloatingOptions,
  useInteractions,
} from "@floating-ui/react";

export const useEventForm = (
  eventType: "grid" | "sidebarWeek" | "sidebarMonth",
  isOpen: boolean,
  onIsFormOpenChange: (
    isOpen: boolean,
    event: Event,
    reason?: OpenChangeReason,
  ) => void,
) => {
  let options: Partial<UseFloatingOptions>;

  if (eventType === "sidebarWeek" || eventType === "sidebarMonth") {
    const placement = eventType === "sidebarWeek" ? "right-start" : "right";
    options = { strategy: "absolute", placement };
  } else {
    options = {
      strategy: "fixed",
      middleware: [
        flip({
          fallbackPlacements: [
            "right-start",
            "right",
            "left-start",
            "left",
            "top-start",
            "bottom-start",
            "top",
            "bottom",
          ],
          fallbackStrategy: "bestFit",
        }),
        offset(7),
        shift(),
      ],
      placement: "right-start",
      whileElementsMounted: autoUpdate,
    };
  }

  const { context, x, y, refs, strategy } = useFloating({
    ...options,
    open: isOpen,
    onOpenChange(newIsOpen, event, reason) {
      onIsFormOpenChange(newIsOpen, event, reason);
    },
  });

  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

  return {
    context,
    getFloatingProps,
    getReferenceProps,
    refs,
    strategy,
    x,
    y,
  };
};

export type EventFormProps = ReturnType<typeof useEventForm>;
