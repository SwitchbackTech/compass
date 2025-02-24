import {
  OpenChangeReason,
  UseFloatingOptions,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import { Categories_Event } from "@core/types/event.types";

export const useEventForm = (
  category: Categories_Event,
  isOpen: boolean,
  onIsFormOpenChange: (
    isOpen: boolean,
    event: Event,
    reason?: OpenChangeReason,
  ) => void,
) => {
  let options: Partial<UseFloatingOptions>;
  const isSomeday =
    category === Categories_Event.SOMEDAY_WEEK ||
    category === Categories_Event.SOMEDAY_MONTH;

  if (isSomeday) {
    const placement =
      category === Categories_Event.SOMEDAY_WEEK ? "right-start" : "right";
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
