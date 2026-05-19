import styled, { css } from "styled-components";
import { ZIndex } from "@web/common/constants/web.constants";
import { GRID_MARGIN_LEFT } from "@web/views/Week/layout.constants";

const BASE_WIDTH = 24;
const MAX_WIDTH = 56;

export const StyledEdgeZone = styled.div<{
  position: "left" | "right";
  progress: number;
}>`
  position: absolute;
  top: 0;
  bottom: 0;
  width: ${({ progress }) => BASE_WIDTH + (MAX_WIDTH - BASE_WIDTH) * (progress / 100)}px;
  pointer-events: none;
  z-index: ${ZIndex.LAYER_1};
  transition: width 0.05s linear;
  ${({ position, progress }) => {
    const opacity = 0.04 + (progress / 100) * 0.06;
    if (position === "left") {
      return css`
        left: ${GRID_MARGIN_LEFT}px;
        background: linear-gradient(
          to right,
          rgba(59, 130, 246, ${opacity}),
          transparent
        );
      `;
    }
    return css`
      right: 0;
      background: linear-gradient(
        to left,
        rgba(59, 130, 246, ${opacity}),
        transparent
      );
    `;
  }}
`;
