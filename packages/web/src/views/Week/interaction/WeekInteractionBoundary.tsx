import { type FC, type PropsWithChildren, useEffect, useRef } from "react";
import { type WeekInteractionAdapter } from "./adapter/WeekInteractionAdapter";

interface Props extends PropsWithChildren {
  adapter: WeekInteractionAdapter;
}

export const WeekInteractionBoundary: FC<Props> = ({ adapter, children }) => {
  const boundaryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const boundary = boundaryRef.current;

    if (!boundary) {
      return;
    }

    const disconnectCancellationEvents = adapter.connectCancellationEvents();

    const handlePointerDown = (event: PointerEvent) => {
      const ownership = adapter.handlePointerDown(event);

      if (!ownership.shouldOwn) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (adapter.handlePointerMove(event)) {
        consumeOwnedPointerEvent(event);
      }
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (adapter.handlePointerUp(event)) {
        consumeOwnedPointerEvent(event);
      }
    };
    const handlePointerCancel = (event: PointerEvent) => {
      if (adapter.handlePointerCancel(event)) {
        consumeOwnedPointerEvent(event);
      }
    };

    boundary.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
    });
    boundary.addEventListener("pointermove", handlePointerMove, {
      capture: true,
    });
    boundary.addEventListener("pointerup", handlePointerUp, {
      capture: true,
    });
    boundary.addEventListener("pointercancel", handlePointerCancel, {
      capture: true,
    });

    return () => {
      boundary.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
      boundary.removeEventListener("pointermove", handlePointerMove, {
        capture: true,
      });
      boundary.removeEventListener("pointerup", handlePointerUp, {
        capture: true,
      });
      boundary.removeEventListener("pointercancel", handlePointerCancel, {
        capture: true,
      });
      adapter.cancel();
      disconnectCancellationEvents();
    };
  }, [adapter]);

  return (
    <div ref={boundaryRef} style={{ display: "contents" }}>
      {children}
    </div>
  );
};

const consumeOwnedPointerEvent = (event: PointerEvent) => {
  event.preventDefault();
  event.stopPropagation();
};
