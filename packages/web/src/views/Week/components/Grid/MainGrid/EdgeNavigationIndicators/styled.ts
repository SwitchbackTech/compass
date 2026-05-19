import styled, { css } from "styled-components";
import { ZIndex } from "@web/common/constants/web.constants";
import { GRID_MARGIN_LEFT } from "@web/views/Week/layout.constants";

export const StyledEdgeZone = styled.div<{
  position: "left" | "right";
}>`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 32px;
  pointer-events: none;
  z-index: ${ZIndex.LAYER_1};
  ${({ position }) =>
    position === "left"
      ? css`
          left: ${GRID_MARGIN_LEFT}px;
          background: linear-gradient(
            to right,
            rgba(59, 130, 246, 0.08),
            transparent
          );
        `
      : css`
          right: 0;
          background: linear-gradient(
            to left,
            rgba(59, 130, 246, 0.08),
            transparent
          );
        `}
`;

export const StyledProgressIndicator = styled.div<{
  progress: number;
  direction: "left" | "right";
}>`
  position: absolute;
  top: 12px;
  ${({ direction }) =>
    direction === "left"
      ? css`
          left: 8px;
        `
      : css`
          right: 8px;
        `}
  width: 16px;
  height: 2px;
  border-radius: 1px;
  background: rgba(96, 165, 250, 0.25);
  overflow: hidden;

  &::after {
    content: "";
    position: absolute;
    top: 0;
    ${({ direction }) =>
      direction === "left"
        ? css`
            left: 0;
          `
        : css`
            right: 0;
          `}
    height: 100%;
    width: ${({ progress }) => progress}%;
    background: rgba(96, 165, 250, 0.55);
    border-radius: 1px;
  }
`;
