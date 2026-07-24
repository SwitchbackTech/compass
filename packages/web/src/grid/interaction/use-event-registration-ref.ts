import {
  type ForwardedRef,
  type MutableRefObject,
  useCallback,
  useRef,
} from "react";
import { type EventRegistry } from "@web/grid/interaction/event.registry";

export const useEventRegistrationRef = <TType extends string>({
  eventId,
  eventType,
  forwardedRef,
  isEnabled,
  registry,
}: {
  eventId: string | undefined;
  eventType: TType;
  forwardedRef?: ForwardedRef<HTMLDivElement>;
  isEnabled: boolean;
  registry: EventRegistry<TType>;
}) => {
  const unregisterRef = useRef<(() => void) | null>(null);

  return useCallback(
    (node: HTMLDivElement | null) => {
      unregisterRef.current?.();
      unregisterRef.current = null;
      assignRef(forwardedRef, node);

      if (!node || !eventId || !isEnabled) {
        return;
      }

      unregisterRef.current = registry.register({
        element: node,
        eventId,
        eventType,
      });
    },
    [eventId, eventType, forwardedRef, isEnabled, registry],
  );
};

const assignRef = (
  ref: ForwardedRef<HTMLDivElement> | undefined,
  node: HTMLDivElement | null,
) => {
  if (!ref) {
    return;
  }

  if (typeof ref === "function") {
    ref(node);
    return;
  }

  (ref as MutableRefObject<HTMLDivElement | null>).current = node;
};
