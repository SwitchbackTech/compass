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
  shift,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import { theme } from "../styles/theme";

export enum CursorItem {
  EventForm = "EventForm",
  EventPreview = "EventPreview",
  EventContextMenu = "EventContextMenu",
}

interface OpenAtCursor {
  nodeId: CursorItem | null;
  floating: UseFloatingReturn;
  interactions: UseInteractionsReturn;
  setNodeId: Dispatch<SetStateAction<CursorItem | null>>;
  setPlacement: Dispatch<SetStateAction<Placement>>;
  setStrategy: Dispatch<SetStateAction<Strategy>>;
}

const themeSpacing = parseInt(theme.spacing.xs);

export const OpenAtCursorContext = createContext<OpenAtCursor | null>(null);

export const openedAtCursorChange$ = new Subject<
  [boolean, Event | undefined, OpenChangeReason | undefined]
>();

export function OpenAtCursorProvider({ children }: PropsWithChildren) {
  const [nodeId, setNodeId] = useState<CursorItem | null>(null);
  const [placement, setPlacement] = useState<Placement>("right-start");
  const [strategy, setStrategy] = useState<Strategy>("absolute");

  const onOpenChanged = useCallback(
    (open: boolean, event?: Event, reason?: OpenChangeReason) => {
      openedAtCursorChange$.next([open, event, reason]);

      if (!open) floating.refs.setReference(null);
    },
    [],
  );

  const floating = useFloating({
    open: nodeId !== null,
    placement,
    strategy,
    middleware: [
      offset(
        ({ rects }) => {
          switch (nodeId) {
            case CursorItem.EventContextMenu:
              return -rects.reference.height / 2 - rects.floating.height / 2;
            default:
              return themeSpacing;
          }
        },
        [nodeId],
      ),
      shift(),
      flip(() => {
        switch (nodeId) {
          case CursorItem.EventContextMenu:
            return {
              fallbackAxisSideDirection: "start",
              crossAxis: placement.includes("-"),
            };
          default:
            return {
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
            };
        }
      }, [nodeId]),
    ],
    onOpenChange: onOpenChanged,
    whileElementsMounted: autoUpdate,
  });

  const dismiss = useDismiss(floating.context, {});
  const interactions = useInteractions([dismiss]);

  return (
    <OpenAtCursorContext.Provider
      value={{
        nodeId,
        floating,
        interactions,
        setNodeId,
        setPlacement,
        setStrategy,
      }}
    >
      {children}
    </OpenAtCursorContext.Provider>
  );
}
