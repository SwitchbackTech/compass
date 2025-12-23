import { useCallback } from "react";
import {
  OpenChangeReason,
  Placement,
  ReferenceType,
  UseFloatingOptions,
  autoUpdate,
  flip,
  hide,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import {
  DATA_FULL_WIDTH,
  DATA_OVERLAPPING,
} from "@web/common/constants/web.constants";
import {
  closeFloatingAtCursor,
  nodeId$,
  open$,
  openFloatingAtCursor,
  placement$,
  reference$,
  strategy$,
  useFloatingNodeIdAtCursor,
  useFloatingOpenAtCursor,
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
  const open = useFloatingOpenAtCursor();
  const nodeId = useFloatingNodeIdAtCursor() ?? undefined;
  const placement = useFloatingPlacementAtCursor();
  const strategy = useFloatingStrategyAtCursor();
  const reference = useFloatingReferenceAtCursor();

  const handleOpenChange = useCallback(
    (stateOpen: boolean, event?: Event, reason?: OpenChangeReason) => {
      const alreadyOpen = open$.getValue();
      const stateMismatch = stateOpen && alreadyOpen;

      if (!stateOpen) {
        onOpenChange?.(stateOpen, event, reason);

        return closeFloatingAtCursor();
      }

      if (stateMismatch) {
        openFloatingAtCursor({
          nodeId: nodeId$.getValue()!,
          reference: reference$.getValue()!,
          placement: placement$.getValue(),
          strategy: strategy$.getValue(),
        });
      }

      onOpenChange?.(stateOpen, event, reason);
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
      offset(({ rects, placement, elements }) => {
        switch (placement) {
          case "bottom":
          case "top": {
            const top = -rects.reference.height / 2 - rects.floating.height / 2;
            const ref = elements.reference as HTMLDivElement;
            const isFullWidth = ref.getAttribute(DATA_FULL_WIDTH) === "true";
            const isOverlapping = ref.getAttribute(DATA_OVERLAPPING) === "true";

            if (isFullWidth && isOverlapping) {
              return top - rects.reference.height / 2;
            }

            return top;
          }
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
      shift(),
      hide({ strategy: "referenceHidden" }),
      hide({ strategy: "escaped" }),
    ],
    onOpenChange: handleOpenChange,
    whileElementsMounted: autoUpdate,
  });

  return floating;
}
