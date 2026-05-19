import { type FC } from "react";
import { useWeekInteractionEdgeNavigationState } from "@web/views/Week/interaction/state/weekInteractionEdgeNavigationState";
import { StyledEdgeZone } from "./styled";

export const EdgeNavigationIndicators: FC = () => {
  const dragEdgeState = useWeekInteractionEdgeNavigationState();
  const { currentEdge, isDragging, progress } = dragEdgeState;

  if (!isDragging || !currentEdge) return null;

  return <StyledEdgeZone position={currentEdge} progress={progress} />;
};
