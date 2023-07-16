import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
  UseFloatingProps,
} from "@floating-ui/react";

export const useEventForm = (
  eventType: "grid" | "sidebarWeek" | "sidebarMonth"
) => {
  let options: Partial<UseFloatingProps>;

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

  const { x, y, reference, floating, strategy } = useFloating(options);

  return {
    x,
    y,
    reference,
    floating,
    strategy,
  };
};

export type EventFormProps = ReturnType<typeof useEventForm>;
