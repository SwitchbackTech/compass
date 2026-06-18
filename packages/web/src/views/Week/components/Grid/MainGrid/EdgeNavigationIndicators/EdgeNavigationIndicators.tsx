import { type FC } from "react";
import { type CSSVariables } from "@web/common/styles/css.types";
import { useWeekInteractionEdgeNavigationState } from "@web/views/Week/interaction/state/weekInteractionEdgeNavigationState";
import { GRID_MARGIN_LEFT } from "@web/views/Week/layout.constants";

export const EdgeNavigationIndicators: FC = () => {
  const dragEdgeState = useWeekInteractionEdgeNavigationState();
  const { currentEdge, isDragging, progress } = dragEdgeState;

  if (!isDragging || !currentEdge) return null;

  return (
    <div
      className="c-week-edge-zone"
      data-position={currentEdge}
      style={
        {
          "--edge-opacity": 0.04 + (progress / 100) * 0.06,
          "--edge-width": `${24 + 32 * (progress / 100)}px`,
          "--grid-margin-left": `${GRID_MARGIN_LEFT}px`,
        } as CSSVariables
      }
    />
  );
};
