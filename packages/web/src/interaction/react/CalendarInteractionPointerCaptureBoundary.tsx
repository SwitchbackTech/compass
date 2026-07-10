import {
  type FC,
  type PropsWithChildren,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { type CalendarInteractionCancellationTargets } from "../CalendarInteractionEngine";

export interface CalendarPointerCaptureAdapter {
  cancel(): void;
  connectCancellationEvents(
    targets?: CalendarInteractionCancellationTargets,
  ): () => void;
  handlePointerCancel(event: PointerEvent): boolean;
  handlePointerDown(event: PointerEvent): {
    reason: string;
    shouldOwn: boolean;
  };
  handlePointerMove(event: PointerEvent): boolean;
  handlePointerUp(event: PointerEvent): boolean;
}

interface Props extends PropsWithChildren {
  adapter: CalendarPointerCaptureAdapter;
}

export const CalendarInteractionPointerCaptureBoundary: FC<Props> = ({
  adapter,
  children,
}) => {
  const activePointerIdRef = useRef<number | null>(null);
  const adapterRef = useRef(adapter);
  const captureElementRef = useRef<HTMLDivElement | null>(null);
  const disconnectPointerContinuationEventsRef = useRef<(() => void) | null>(
    null,
  );

  adapterRef.current = adapter;

  const clearActivePointer = useCallback(() => {
    const pointerId = activePointerIdRef.current;
    const captureElement = captureElementRef.current;

    disconnectPointerContinuationEventsRef.current?.();
    disconnectPointerContinuationEventsRef.current = null;
    activePointerIdRef.current = null;
    captureElementRef.current = null;

    if (pointerId === null || !captureElement) {
      return;
    }

    try {
      captureElement.releasePointerCapture?.(pointerId);
    } catch {
      // Pointer capture may already be gone after pointerup/cancel.
    }
  }, []);

  useEffect(() => {
    const disconnectCancellationEvents = adapter.connectCancellationEvents();

    return () => {
      clearActivePointer();
      adapter.cancel();
      disconnectCancellationEvents();
    };
  }, [adapter, clearActivePointer]);

  const handlePointerDownCapture = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const ownership = adapter.handlePointerDown(event.nativeEvent);

    if (!ownership.shouldOwn) {
      return;
    }

    consumeOwnedPointerEvent(event);
    connectActivePointer(event.currentTarget, event.nativeEvent.pointerId);
  };

  const handlePointerMoveCapture = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (adapter.handlePointerMove(event.nativeEvent)) {
      consumeOwnedPointerEvent(event);
    }
  };

  const handlePointerUpCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (adapter.handlePointerUp(event.nativeEvent)) {
      consumeOwnedPointerEvent(event);
    }
  };

  const handlePointerCancelCapture = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (adapter.handlePointerCancel(event.nativeEvent)) {
      consumeOwnedPointerEvent(event);
    }
  };

  return (
    <div
      onPointerCancelCapture={handlePointerCancelCapture}
      onPointerDownCapture={handlePointerDownCapture}
      onPointerMoveCapture={handlePointerMoveCapture}
      onPointerUpCapture={handlePointerUpCapture}
      style={{ display: "contents" }}
    >
      {children}
    </div>
  );

  function connectActivePointer(element: HTMLDivElement, pointerId: number) {
    clearActivePointer();

    activePointerIdRef.current = pointerId;
    captureElementRef.current = element;
    try {
      element.setPointerCapture?.(pointerId);
    } catch {
      // Pointer capture can throw if the browser has already released it.
    }

    const handleWindowPointerMove = (event: PointerEvent) => {
      if (!isActivePointer(event)) {
        return;
      }

      if (adapterRef.current.handlePointerMove(event)) {
        consumeNativePointerEvent(event);
      }
    };

    const handleWindowPointerUp = (event: PointerEvent) => {
      if (!isActivePointer(event)) {
        return;
      }

      const shouldConsume = adapterRef.current.handlePointerUp(event);
      clearActivePointer();

      if (shouldConsume) {
        consumeNativePointerEvent(event);
      }
    };

    const handleWindowPointerCancel = (event: PointerEvent) => {
      if (!isActivePointer(event)) {
        return;
      }

      const shouldConsume = adapterRef.current.handlePointerCancel(event);
      clearActivePointer();

      if (shouldConsume) {
        consumeNativePointerEvent(event);
      }
    };

    window.addEventListener("pointermove", handleWindowPointerMove, true);
    window.addEventListener("pointerup", handleWindowPointerUp, true);
    window.addEventListener("pointercancel", handleWindowPointerCancel, true);
    window.addEventListener(
      "lostpointercapture",
      handleWindowPointerCancel,
      true,
    );

    disconnectPointerContinuationEventsRef.current = () => {
      window.removeEventListener("pointermove", handleWindowPointerMove, true);
      window.removeEventListener("pointerup", handleWindowPointerUp, true);
      window.removeEventListener(
        "pointercancel",
        handleWindowPointerCancel,
        true,
      );
      window.removeEventListener(
        "lostpointercapture",
        handleWindowPointerCancel,
        true,
      );
    };
  }

  function isActivePointer(event: Pick<PointerEvent, "pointerId">) {
    return activePointerIdRef.current === event.pointerId;
  }
};

const consumeOwnedPointerEvent = (
  event: Pick<
    ReactPointerEvent<HTMLDivElement>,
    "preventDefault" | "stopPropagation"
  >,
) => {
  event.preventDefault();
  event.stopPropagation();
};

const consumeNativePointerEvent = (
  event: Pick<PointerEvent, "preventDefault" | "stopPropagation">,
) => {
  event.preventDefault();
  event.stopPropagation();
};
