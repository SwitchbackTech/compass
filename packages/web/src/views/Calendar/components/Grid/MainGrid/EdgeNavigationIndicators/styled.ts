import styled, { css, keyframes } from "styled-components";
import { ZIndex } from "@web/common/constants/web.constants";

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const pulseGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
  }
  50% {
    box-shadow: 0 0 30px rgba(59, 130, 246, 0.6);
  }
`;

export const StyledEdgeZone = styled.div<{
  position: "left" | "right";
  isActive: boolean;
  isTimerActive: boolean;
}>`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50px;
  opacity: 0;
  animation: ${fadeIn} 0.6s ease-out forwards;
  animation-delay: 0.05s;
  z-index: ${ZIndex.LAYER_5};
  ${({ position }) =>
    position === "left"
      ? css`
          left: 35px; /* Account for time labels */
          background: linear-gradient(
            to right,
            rgba(59, 130, 246, 0.1),
            rgba(59, 130, 246, 0.05),
            transparent
          );
        `
      : css`
          right: 0;
          background: linear-gradient(
            to left,
            rgba(59, 130, 246, 0.1),
            rgba(59, 130, 246, 0.05),
            transparent
          );
        `}

  ${({ isActive, position }) =>
    isActive &&
    css`
      opacity: 1 !important;
      background: ${position === "left"
        ? "linear-gradient(to right, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1), transparent)"
        : "linear-gradient(to left, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1), transparent)"};
    `}

  ${({ isTimerActive, position }) =>
    isTimerActive &&
    css`
      opacity: 1 !important;
      animation:
        ${pulseGlow} 1s ease-in-out infinite,
        ${fadeIn} 0.6s ease-out forwards;
      animation-delay: 0s, 0.05s;
      background: ${position === "left"
        ? "linear-gradient(to right, rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.15), transparent)"
        : "linear-gradient(to left, rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.15), transparent)"};
    `}

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease-in-out;
`;

export const StyledProgressIndicator = styled.div<{
  progress: number;
  direction: "left" | "right";
}>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: conic-gradient(
    from ${({ direction }) => (direction === "left" ? "180deg" : "0deg")},
    rgba(59, 130, 246, 0.8) ${({ progress }) => progress}%,
    rgba(255, 255, 255, 0.2) 0%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  animation: ${fadeIn} 0.2s ease-out;
  backdrop-filter: blur(4px);
  border: 2px solid rgba(255, 255, 255, 0.3);

  &::before {
    content: "";
    position: absolute;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
  }
`;

export const StyledNavigationIcon = styled.div<{ direction: "left" | "right" }>`
  font-size: 18px;
  font-weight: bold;
  color: rgba(59, 130, 246, 0.9);
  margin-bottom: 4px;
  animation: ${fadeIn} 0.2s ease-out;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

export const StyledNavigationLabel = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: rgba(59, 130, 246, 0.8);
  text-align: center;
  white-space: nowrap;
  animation: ${fadeIn} 0.2s ease-out;
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 6px;
  border-radius: 4px;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(59, 130, 246, 0.2);
  text-shadow: none;
`;
