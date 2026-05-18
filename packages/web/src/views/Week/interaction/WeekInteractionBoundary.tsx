import {
  type FC,
  type PropsWithChildren,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { WeekInteractionAdapter } from "./WeekInteractionAdapter";

interface Props extends PropsWithChildren {
  adapter?: WeekInteractionAdapter;
}

export const WeekInteractionBoundary: FC<Props> = ({ adapter, children }) => {
  const boundaryRef = useRef<HTMLDivElement | null>(null);
  const defaultAdapter = useMemo(() => new WeekInteractionAdapter(), []);
  const activeAdapter = adapter ?? defaultAdapter;

  useEffect(() => {
    const boundary = boundaryRef.current;

    if (!boundary) {
      return;
    }

    const disconnectCancellationEvents =
      activeAdapter.connectCancellationEvents();

    const handlePointerDown = (event: PointerEvent) => {
      const ownership = activeAdapter.handlePointerDown(event);

      if (!ownership.shouldOwn) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (activeAdapter.handlePointerMove(event)) {
        consumeOwnedPointerEvent(event);
      }
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (activeAdapter.handlePointerUp(event)) {
        consumeOwnedPointerEvent(event);
      }
    };
    const handlePointerCancel = (event: PointerEvent) => {
      if (activeAdapter.handlePointerCancel(event)) {
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
      disconnectCancellationEvents();
    };
  }, [activeAdapter]);

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
