import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useCallback,
  useState,
} from "react";
import { Subject } from "rxjs";
import {
  OpenChangeReason,
  Placement,
  Strategy,
  UseFloatingReturn,
  UseInteractionsReturn,
  autoUpdate,
  flip,
  offset,
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
} from "@floating-ui/react";
import { theme } from "@web/common/styles/theme";

export enum CursorItem {
  EventForm = "EventForm",
  EventPreview = "EventPreview",
  EventContextMenu = "EventContextMenu",
}

interface OpenAtCursor {
  nodeId: CursorItem | null;
  floating: UseFloatingReturn;
  interactions: UseInteractionsReturn;
  setOpen: Dispatch<SetStateAction<boolean>>;
  setNodeId: Dispatch<SetStateAction<CursorItem | null>>;
  setPlacement: Dispatch<SetStateAction<Placement>>;
  setStrategy: Dispatch<SetStateAction<Strategy>>;
  setReference: Dispatch<SetStateAction<Element | null>>;
  closeOpenAtCursor: () => void;
}

const themeSpacing = parseInt(theme.spacing.xs);

export const OpenAtCursorContext = createContext<OpenAtCursor | null>(null);

export const openedAtCursorChange$ = new Subject<
  [boolean, Event | undefined, OpenChangeReason | undefined]
>();

export function OpenAtCursorProvider({ children }: PropsWithChildren) {
  const [open, setOpen] = useState<boolean>(false);
  const [nodeId, setNodeId] = useState<CursorItem | null>(null);
  const [placement, setPlacement] = useState<Placement>("right-start");
  const [strategy, setStrategy] = useState<Strategy>("absolute");
  const [reference, setReference] = useState<Element | null>(null);

  const closeOpenAtCursor = useCallback(() => {
    setPlacement("right-start");
    setNodeId(null);
    setReference(null);
  }, [setNodeId, setReference, setPlacement]);

  const onOpenChanged = useCallback(
    (open: boolean, event?: Event, reason?: OpenChangeReason) => {
      setOpen(open);

      if (!open) closeOpenAtCursor();

      openedAtCursorChange$.next([open, event, reason]);
    },
    [closeOpenAtCursor],
  );

  // run this outside of react in future, to avoid unnecessary re-renders
  const floating = useFloating({
    open,
    placement,
    elements: { reference },
    strategy,
    middleware: [
      offset(({ rects, placement }) => {
        switch (placement) {
          case "bottom":
            return -rects.reference.height / 2 - rects.floating.height / 2;
          default:
            return themeSpacing;
        }
      }),
      flip(
        ({ placement, initialPlacement }) => {
          switch (initialPlacement) {
            case "bottom":
              return {
                fallbackStrategy: "initialPlacement",
                fallbackAxisSideDirection: "start",
                crossAxis: placement.includes("-"),
              };
            case "right-start":
              return {
                fallbackPlacements: ["left-start"],
                fallbackStrategy: "initialPlacement",
              };
            default:
              return {
                fallbackPlacements: [
                  "right-start",
                  "right",
                  "left",
                  "top-start",
                  "bottom-start",
                  "top",
                  "bottom",
                ],
                fallbackStrategy: "bestFit",
              };
          }
        },
        [nodeId],
      ),
    ],
    onOpenChange: onOpenChanged,
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(floating.context);

  const hover = useHover(floating.context, { move: false, delay: 5000 });

  const focus = useFocus(floating.context, { visibleOnly: true });

  const dismiss = useDismiss(floating.context);

  const interactions = useInteractions([click, hover, focus, dismiss]);

  return (
    <OpenAtCursorContext.Provider
      value={{
        nodeId,
        floating,
        interactions,
        setOpen,
        setNodeId,
        setPlacement,
        setStrategy,
        setReference,
        closeOpenAtCursor,
      }}
    >
      {children}
    </OpenAtCursorContext.Provider>
  );
}
