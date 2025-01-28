import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
  UseFloatingOptions,
} from "@floating-ui/react";

export const useEventForm = (
  eventType: "grid" | "sidebarWeek" | "sidebarMonth"
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

  const { context, x, y, refs, strategy } = useFloating(options);

  return {
    context,
    refs,
    strategy,
    x,
    y,
  };
};

export type EventFormProps = ReturnType<typeof useEventForm>;
