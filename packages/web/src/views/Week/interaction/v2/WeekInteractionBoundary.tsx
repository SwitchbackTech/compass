import { type PropsWithChildren, useEffect, useMemo, useRef } from "react";
import { WeekInteractionController } from "./WeekInteractionController";

interface Props extends PropsWithChildren {
  controller?: WeekInteractionController;
}

export const WeekInteractionBoundary = ({ children, controller }: Props) => {
  const boundaryRef = useRef<HTMLDivElement | null>(null);
  const defaultController = useMemo(() => new WeekInteractionController(), []);
  const activeController = controller ?? defaultController;

  useEffect(() => {
    const boundaryElement = boundaryRef.current;

    if (!boundaryElement) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const isOwned = activeController.handlePointerDown(event);

      if (!isOwned) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    };

    boundaryElement.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
    });

    return () => {
      boundaryElement.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
    };
  }, [activeController]);

  return (
    <div
      data-week-interaction-boundary="true"
      ref={boundaryRef}
      style={{ display: "contents" }}
    >
      {children}
    </div>
  );
};
