import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
  UseFloatingProps,
} from "@floating-ui/react";

export const useEventForm = (event: "grid" | "sidebar") => {
  let options: Partial<UseFloatingProps>;

  if (event === "sidebar") {
    options = { strategy: "absolute", placement: "right-start" };
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
