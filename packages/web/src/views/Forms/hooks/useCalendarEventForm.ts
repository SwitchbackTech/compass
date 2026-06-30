import {
  autoUpdate,
  flip,
  type OpenChangeReason,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import { useCallback, useState } from "react";

type OutsidePress = NonNullable<
  Parameters<typeof useDismiss>[1]
>["outsidePress"];

interface Options {
  onDismiss?: (reason: "escape-key" | "outside-press") => void;
  outsidePress?: OutsidePress;
}

const fallbackPlacements = [
  "right-start",
  "right",
  "left-start",
  "left",
  "top-start",
  "bottom-start",
  "top",
  "bottom",
] as const;

export const useCalendarEventForm = ({
  onDismiss,
  outsidePress,
}: Options = {}) => {
  const [isOpen, setIsOpen] = useState(false);
  const openForm = useCallback(() => setIsOpen(true), []);
  const closeForm = useCallback(() => setIsOpen(false), []);
  const onOpenChange = useCallback(
    (open: boolean, _event?: Event, reason?: OpenChangeReason) => {
      setIsOpen(open);

      if (!open && (reason === "escape-key" || reason === "outside-press")) {
        onDismiss?.(reason);
      }
    },
    [onDismiss],
  );
  const floating = useFloating({
    middleware: [
      offset(7),
      flip({
        fallbackPlacements: [...fallbackPlacements],
        fallbackStrategy: "bestFit",
      }),
      shift(),
    ],
    onOpenChange,
    open: isOpen,
    placement: "right-start",
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
  });
  const dismiss = useDismiss(floating.context, {
    enabled: true,
    outsidePress,
    outsidePressEvent: "click",
  });
  const interactions = useInteractions([dismiss]);

  return {
    ...floating,
    ...interactions,
    closeForm,
    isOpen,
    openForm,
  };
};

export type CalendarEventFormController = ReturnType<
  typeof useCalendarEventForm
>;
