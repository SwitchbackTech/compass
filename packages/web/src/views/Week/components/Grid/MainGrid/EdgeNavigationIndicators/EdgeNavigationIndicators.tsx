import { type FC } from "react";
import { type DragEdgeNavigationState } from "@web/views/Week/hooks/grid/useDragEdgeNavigation";
import { useWeekInteractionEdgeNavigationState } from "@web/views/Week/interaction/weekInteractionEdgeNavigationState";
import { StyledEdgeZone } from "./styled";

interface Props {
  draftDragEdgeState: DragEdgeNavigationState;
}

export const EdgeNavigationIndicators: FC<Props> = ({ draftDragEdgeState }) => {
  const savedDragEdgeState = useWeekInteractionEdgeNavigationState();
  const dragEdgeState = savedDragEdgeState.isDragging
    ? savedDragEdgeState
    : draftDragEdgeState;
  const { currentEdge, isDragging, progress } = dragEdgeState;

  if (!isDragging || !currentEdge) return null;

  return <StyledEdgeZone position={currentEdge} progress={progress} />;
};
