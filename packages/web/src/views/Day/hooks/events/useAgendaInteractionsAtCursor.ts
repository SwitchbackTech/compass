import {
  safePolygon,
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
} from "@floating-ui/react";
import { CursorItem } from "@web/common/hooks/useOpenAtCursor";

export function useAgendaInteractionsAtCursor(
  floating: ReturnType<typeof useFloating>,
  { enabled }: { enabled?: boolean } = {},
) {
  const eventFormOpen = floating.context.nodeId === CursorItem.EventForm;

  const click = useClick(floating.context, {
    toggle: true,
    stickIfOpen: true,
    enabled,
  });

  const hover = useHover(floating.context, {
    handleClose: safePolygon({ buffer: -Infinity }),
    enabled: enabled && !eventFormOpen,
  });

  const focus = useFocus(floating.context, {
    visibleOnly: true,
    enabled: enabled && !eventFormOpen,
  });

  const dismiss = useDismiss(floating.context, { enabled });

  const interactions = useInteractions([click, focus, hover, dismiss]);

  return interactions;
}
