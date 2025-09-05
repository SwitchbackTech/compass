import React, { FC } from "react";
import { DragEdgeNavigationState } from "@web/views/Calendar/hooks/grid/useDragEdgeNavigation";
import {
  StyledEdgeZone,
  StyledNavigationIcon,
  StyledNavigationLabel,
  StyledProgressIndicator,
} from "./styled";

interface Props {
  dragEdgeState: DragEdgeNavigationState;
}

export const EdgeNavigationIndicators: FC<Props> = ({ dragEdgeState }) => {
  if (!dragEdgeState.isDragging) return null;

  return (
    <>
      {/* Left edge zone */}
      <StyledEdgeZone
        position="left"
        isActive={dragEdgeState.currentEdge === "left"}
        isTimerActive={
          dragEdgeState.isTimerActive && dragEdgeState.currentEdge === "left"
        }
      >
        {dragEdgeState.currentEdge === "left" && (
          <>
            <StyledProgressIndicator
              progress={dragEdgeState.progress}
              direction="left"
            />
            <StyledNavigationIcon direction="left">←</StyledNavigationIcon>
            <StyledNavigationLabel>Previous Week</StyledNavigationLabel>
          </>
        )}
      </StyledEdgeZone>

      {/* Right edge zone */}
      <StyledEdgeZone
        position="right"
        isActive={dragEdgeState.currentEdge === "right"}
        isTimerActive={
          dragEdgeState.isTimerActive && dragEdgeState.currentEdge === "right"
        }
      >
        {dragEdgeState.currentEdge === "right" && (
          <>
            <StyledProgressIndicator
              progress={dragEdgeState.progress}
              direction="right"
            />
            <StyledNavigationIcon direction="right">→</StyledNavigationIcon>
            <StyledNavigationLabel>Next Week</StyledNavigationLabel>
          </>
        )}
      </StyledEdgeZone>
    </>
  );
};
