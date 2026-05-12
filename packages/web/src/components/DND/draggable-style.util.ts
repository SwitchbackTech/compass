import {
  type DraggableStateSnapshot,
  type DraggableStyle,
} from "@hello-pangea/dnd";

export function getDraggableStyle(
  snapshot: DraggableStateSnapshot,
  isOverGrid: boolean,
  style?: DraggableStyle,
) {
  if (!snapshot.isDropAnimating) {
    return style;
  }

  return isOverGrid ? { ...style, transitionDuration: "0.001s" } : style;
}
