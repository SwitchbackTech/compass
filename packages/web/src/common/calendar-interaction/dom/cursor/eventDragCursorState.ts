import { useSyncExternalStore } from "react";

/**
 * Single source of truth for "is the user actively dragging an event".
 *
 * Both drag systems report into this store: the legacy Week draft drag (React)
 * and the CalendarInteractionEngine path for saved events (non-React). Keeping
 * it as a lightweight external store — mirroring
 * `weekInteractionEdgeNavigationState` — lets the non-React engine write to it
 * directly without any Redux dispatch plumbing.
 *
 * The cursor itself is applied in exactly one place: `useEventDragCursor`.
 */

let isDraggingEvent = false;
const listeners = new Set<() => void>();

export const getIsDraggingEvent = () => isDraggingEvent;

export const setIsDraggingEvent = (next: boolean) => {
  if (isDraggingEvent === next) {
    return;
  }

  isDraggingEvent = next;

  for (const listener of listeners) {
    listener();
  }
};

export const subscribeToIsDraggingEvent = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const useIsDraggingEvent = () =>
  useSyncExternalStore(
    subscribeToIsDraggingEvent,
    getIsDraggingEvent,
    getIsDraggingEvent,
  );
