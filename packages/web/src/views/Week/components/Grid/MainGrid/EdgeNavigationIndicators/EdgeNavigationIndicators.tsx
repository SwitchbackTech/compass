import { type FC } from "react";
import { type DragEdgeNavigationState } from "@web/views/Week/hooks/grid/useDragEdgeNavigation";
import { StyledEdgeZone, StyledProgressIndicator } from "./styled";

interface Props {
  dragEdgeState: DragEdgeNavigationState;
}

export const EdgeNavigationIndicators: FC<Props> = ({ dragEdgeState }) => {
  const { currentEdge, isDragging, progress } = dragEdgeState;

  if (!isDragging || !currentEdge) return null;

  return (
    <StyledEdgeZone position={currentEdge}>
      <StyledProgressIndicator progress={progress} direction={currentEdge} />
    </StyledEdgeZone>
  );
};
