import {
  Resizable as ReResizable,
  ResizableProps,
  ResizeCallback,
  ResizeStartCallback,
} from "re-resizable";
import {
  PropsWithChildren,
  cloneElement,
  isValidElement,
  useCallback,
} from "react";
import { UniqueIdentifier } from "@dnd-kit/core";
import { usePointerPosition } from "@web/common/hooks/usePointerPosition";
import { resizeId$ } from "@web/common/hooks/useResizeId";
import { resizing$ } from "@web/common/hooks/useResizing";
import { DNDChildProps } from "@web/components/DND/Draggable";

interface Props extends ResizableProps {
  id: UniqueIdentifier;
  dndProps?: DNDChildProps;
}

export function Resizable({
  children,
  dndProps,
  onResizeStart,
  onResizeStop,
  id,
  ...props
}: PropsWithChildren<Props>) {
  const { togglePointerMovementTracking } = usePointerPosition();
  const isValidChildren = isValidElement(children);

  const handleResizeStart = useCallback<ResizeStartCallback>(
    (e, direction, ref) => {
      togglePointerMovementTracking(true);
      resizing$.next(true);
      resizeId$.next(id);
      onResizeStart?.(e, direction, ref);
    },
    [togglePointerMovementTracking, onResizeStart, id],
  );

  const handleResizeStop = useCallback<ResizeCallback>(
    (e, direction, ref, delta) => {
      resizing$.next(false);
      resizeId$.next(null);
      onResizeStop?.(e, direction, ref, delta);
      togglePointerMovementTracking(false);
    },
    [togglePointerMovementTracking, onResizeStop],
  );

  if (!isValidChildren) return null;

  return (
    <ReResizable
      {...props}
      onResizeStart={handleResizeStart}
      onResizeStop={handleResizeStop}
    >
      {cloneElement(children, {
        id,
        ...children.props,
        ...(dndProps ? { dndProps } : {}),
      })}
    </ReResizable>
  );
}
