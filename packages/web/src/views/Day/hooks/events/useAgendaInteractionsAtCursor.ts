import {
  safePolygon,
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
} from "@floating-ui/react";

export function useAgendaInteractionsAtCursor(
  floating: ReturnType<typeof useFloating>,
) {
  const click = useClick(floating.context, {
    toggle: false,
    stickIfOpen: true,
  });

  const hover = useHover(floating.context, {
    handleClose: safePolygon({ blockPointerEvents: true, buffer: -Infinity }),
  });

  const focus = useFocus(floating.context, { visibleOnly: true });

  const dismiss = useDismiss(floating.context, { outsidePress: false });

  const interactions = useInteractions([click, focus, hover, dismiss]);

  return interactions;
}
