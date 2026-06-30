import {
  autoUpdate,
  flip,
  hide,
  type OpenChangeReason,
  offset,
  type Placement,
  shift,
  type UseDismissProps,
  type UseFloatingOptions,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import { Categories_Event } from "@core/types/event.types";
import {
  DATA_FULL_WIDTH,
  DATA_OVERLAPPING,
} from "@web/common/constants/web.constants";
import { theme } from "@web/common/styles/theme";

const themeSpacing = parseInt(theme.spacing.xs, 10);

const fallbackPlacements: Placement[] = [
  "right-start",
  "bottom-start",
  "top-start",
  "left-start",
];

export interface UseEventFormOptions {
  /** Options forwarded to floating-ui's `useDismiss`. */
  dismiss?: UseDismissProps;
}

export const useEventForm = (
  category: Categories_Event,
  isOpen: boolean,
  onIsFormOpenChange: (
    isOpen: boolean,
    event: Event,
    reason?: OpenChangeReason,
  ) => void,
  options?: UseEventFormOptions,
) => {
  let positioning: Partial<UseFloatingOptions>;
  const isSomeday =
    category === Categories_Event.SOMEDAY_WEEK ||
    category === Categories_Event.SOMEDAY_MONTH;

  if (isSomeday) {
    const placement =
      category === Categories_Event.SOMEDAY_WEEK ? "right-start" : "right";
    positioning = { strategy: "absolute", placement };
  } else {
    // Shared positioning for grid (Day + Week) event forms. Anchors the form
    // beside the draft event, flips it clear of viewport edges, and nudges it
    // off full-width / overlapping events.
    positioning = {
      strategy: "fixed",
      placement: "right-start",
      whileElementsMounted: autoUpdate,
      middleware: [
        offset(({ rects, placement, elements }) => {
          switch (placement) {
            case "bottom":
            case "top": {
              const top =
                -rects.reference.height / 2 - rects.floating.height / 2;
              const reference = elements.reference;
              const referenceElement =
                reference instanceof Element
                  ? reference
                  : reference.contextElement;
              const isFullWidth =
                referenceElement?.getAttribute(DATA_FULL_WIDTH) === "true";
              const isOverlapping =
                referenceElement?.getAttribute(DATA_OVERLAPPING) === "true";

              if (isFullWidth && isOverlapping) {
                return top - rects.reference.height / 2;
              }

              return top;
            }
            default:
              return themeSpacing;
          }
        }),
        flip(({ placement }) => ({
          fallbackPlacements: fallbackPlacements.filter((p) => p !== placement),
          fallbackStrategy: "bestFit",
          fallbackAxisSideDirection: "start",
          crossAxis: placement.includes("-"),
        })),
        shift(),
        hide({ strategy: "referenceHidden" }),
        hide({ strategy: "escaped" }),
      ],
    };
  }

  const { context, floatingStyles, x, y, refs, strategy } = useFloating({
    ...positioning,
    open: isOpen,
    onOpenChange(newIsOpen: boolean, event: Event, reason?: OpenChangeReason) {
      onIsFormOpenChange(newIsOpen, event, reason);
    },
  });

  const dismiss = useDismiss(context, options?.dismiss);
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

  return {
    context,
    floatingStyles,
    getFloatingProps,
    getReferenceProps,
    refs,
    strategy,
    x,
    y,
  };
};

export type EventFormProps = ReturnType<typeof useEventForm>;
