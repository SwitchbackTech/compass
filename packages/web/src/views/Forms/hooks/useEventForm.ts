import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
  UseFloatingOptions,
} from "@floating-ui/react";
import { useState } from "react";

export const useEventForm = (
  eventType: "grid" | "sidebarWeek" | "sidebarMonth"
) => {
  let options: Partial<UseFloatingOptions>;

  const [reference, setReference] = useState(null);

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

  const {
    x,
    y,
    refs: { setFloating },
    strategy,
    context,
  } = useFloating({
    ...options,
    elements: {
      reference,
    },
  });

  return {
    x,
    y,
    strategy,
    context,
    setReference,
    setFloating,
  };
};

export type EventFormProps = ReturnType<typeof useEventForm>;
