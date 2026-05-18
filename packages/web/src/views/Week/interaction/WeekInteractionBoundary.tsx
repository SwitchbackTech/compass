import {
  type FC,
  Profiler,
  type PropsWithChildren,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { WeekInteractionAdapter } from "./WeekInteractionAdapter";
import { recordWeekInteractionRender } from "./WeekInteractionMetrics";

interface Props extends PropsWithChildren {
  adapter?: WeekInteractionAdapter;
}

export const WeekInteractionBoundary: FC<Props> = ({ adapter, children }) => {
  const boundaryRef = useRef<HTMLDivElement | null>(null);
  const adapterRef = useRef(adapter);

  adapterRef.current = adapter;

  const defaultAdapter = useMemo(() => new WeekInteractionAdapter(), []);
  const activeAdapter = adapter ?? defaultAdapter;

  useEffect(() => {
    const boundary = boundaryRef.current;

    if (!boundary) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const ownership = activeAdapter.handlePointerDown(event);

      if (!ownership.shouldOwn) {
        return;
      }

      activeAdapter.recordOwnedPointerDown();
      event.preventDefault();
      event.stopPropagation();
    };
    const handlePointerMove = (event: PointerEvent) => {
      activeAdapter.handlePointerMove(event);
    };
    const handlePointerUp = (event: PointerEvent) => {
      activeAdapter.handlePointerUp(event);
    };
    const handlePointerCancel = (event: PointerEvent) => {
      activeAdapter.handlePointerCancel(event);
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
    };
  }, [activeAdapter]);

  return (
    <Profiler
      id="WeekInteractionBoundary"
      onRender={() => {
        recordWeekInteractionRender(activeAdapter.getMetrics());
      }}
    >
      <div
        data-week-interaction-boundary="true"
        ref={boundaryRef}
        style={{ display: "contents" }}
      >
        {children}
      </div>
    </Profiler>
  );
};
