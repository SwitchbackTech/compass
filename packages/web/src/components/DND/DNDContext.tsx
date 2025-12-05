import { PropsWithChildren } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

export function DNDContext({ children }: PropsWithChildren) {
  const keyboardSensor = useSensor(KeyboardSensor);

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 5 },
  });

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 5 },
  });

  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);

  return <DndContext sensors={sensors}>{children}</DndContext>;
}
