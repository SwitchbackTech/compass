import { useCallback, useState } from "react";
import {
  OpenChangeReason,
  Placement,
  ReferenceType,
  UseFloatingOptions,
  autoUpdate,
  flip,
  offset,
  useFloating,
} from "@floating-ui/react";
import {
  closeFloatingAtCursor,
  useFloatingNodeIdAtCursor,
  useFloatingPlacementAtCursor,
  useFloatingReferenceAtCursor,
  useFloatingStrategyAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { theme } from "@web/common/styles/theme";

const themeSpacing = parseInt(theme.spacing.xs);

const placements: Placement[] = [
  "right-start",
  "bottom-start",
  "top-start",
  "left-start",
];

export function useFloatingAtCursor(
  onOpenChange?: UseFloatingOptions<ReferenceType>["onOpenChange"],
): ReturnType<typeof useFloating> {
  const [open, setOpen] = useState(false);
  const nodeId = useFloatingNodeIdAtCursor() ?? undefined;
  const placement = useFloatingPlacementAtCursor();
  const strategy = useFloatingStrategyAtCursor();
  const reference = useFloatingReferenceAtCursor();

  const handleOpenChange = useCallback(
    (open: boolean, event?: Event, reason?: OpenChangeReason) => {
      onOpenChange?.(open, event, reason);

      if (!open) closeFloatingAtCursor();

      setOpen(open);
    },
    [onOpenChange],
  );

  const floating = useFloating({
    open,
    nodeId,
    placement,
    strategy,
    elements: { reference },
    middleware: [
      offset(({ rects, placement }) => {
        switch (placement) {
          case "bottom":
          case "top":
            return -rects.reference.height / 2 - rects.floating.height / 2;
          default:
            return themeSpacing;
        }
      }),
      flip(({ placement }) => {
        return {
          fallbackPlacements: placements.filter((p) => p !== placement),
          fallbackStrategy: "bestFit",
          fallbackAxisSideDirection: "start",
          crossAxis: placement.includes("-"),
        };
      }),
    ],
    onOpenChange: handleOpenChange,
    whileElementsMounted: autoUpdate,
  });

  return floating;
}
