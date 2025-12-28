import { PropsWithChildren, useCallback } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { isDraggingEvent$ } from "@web/common/hooks/useIsDraggingEvent";
import { usePointerPosition } from "@web/common/hooks/usePointerPosition";

export function DNDContext({ children }: PropsWithChildren) {
  const { togglePointerMovementTracking } = usePointerPosition();

  const onActivation = useCallback(() => {
    togglePointerMovementTracking(true);
    isDraggingEvent$.next(true);
  }, [togglePointerMovementTracking]);

  const onDeactivation = useCallback(() => {
    isDraggingEvent$.next(false);
    togglePointerMovementTracking(false);
  }, [togglePointerMovementTracking]);

  const keyboardSensor = useSensor(KeyboardSensor, {
    keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    onActivation,
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 5 },
    onActivation,
  });

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 5 },
    onActivation,
  });

  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);

  return (
    <DndContext
      sensors={sensors}
      onDragAbort={onDeactivation}
      onDragCancel={onDeactivation}
      onDragEnd={onDeactivation}
    >
      {children}
    </DndContext>
  );
}
