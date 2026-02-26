import styled, { css, keyframes } from "styled-components";
import { ZIndex } from "@web/common/constants/web.constants";
import { theme } from "@web/common/styles/theme";

// Hand-drawn underline animation
const drawHandwrittenUnderline = keyframes`
  0% {
    stroke-dashoffset: 1000;
    opacity: 0.7;
  }
  100% {
    stroke-dashoffset: 0;
    opacity: 1;
  }
`;

// Animations
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const subtle = keyframes`
  0%, 100% {
    filter: brightness(100%);
  }
  50% {
    filter: brightness(110%);
  }
`;

const gradientWave = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

// Character counter
export const StyledCharCounter = styled.div<{ isNearLimit: boolean }>`
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  font-size: 12px;
  color: ${({ isNearLimit, theme }) =>
    isNearLimit ? theme.color.status.warning : theme.color.text.lightInactive};
  opacity: 0.8;
  text-align: center;
  width: 100%;
`;

export const StyledReminderPlaceholder = styled.div`
  font-family: "Caveat", cursive;
  font-size: 28px;
  color: ${({ theme }) => theme.color.text.lightInactive};
  text-align: center;
  font-style: italic;
  cursor: pointer;
  animation: ${fadeIn} 0.5s ease-out;
  position: relative;
  padding: 0 10px;

  &:hover {
    color: ${({ theme }) => theme.color.text.light};
    transition: color 0.3s ease;
  }
`;

export const _StyledPlaceholderUnderline = styled.svg<{ isVisible: boolean }>`
  position: absolute;
  bottom: 0;
  left: -5px;
  width: calc(100% + 10px);
  height: 20px;
  pointer-events: none;
  opacity: ${({ isVisible }) => (isVisible ? 1 : 0)};

  path {
    fill: none;
    stroke: ${({ theme }) => theme.color.border.primary};
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 1000;
    stroke-dashoffset: ${({ isVisible }) => (isVisible ? 0 : 1000)};
    animation: ${({ isVisible }) =>
        isVisible ? drawHandwrittenUnderline : "none"}
      0.8s ease-out forwards;
  }
`;
export const StyledPlaceholderUnderline = styled.svg<{ isVisible: boolean }>`
  position: absolute;
  bottom: 0;
  left: -5px;
  width: calc(100% + 10px);
  height: 20px;
  pointer-events: none;
  opacity: ${({ isVisible }) => (isVisible ? 1 : 0)};

  path {
    fill: none;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 1000;
    stroke-dashoffset: ${({ isVisible }) => (isVisible ? 0 : 1000)};
    animation: ${({ isVisible }) =>
        isVisible ? drawHandwrittenUnderline : "none"}
      0.8s ease-out forwards;
  }
`;

export const StyledReminderContainer = styled.div`
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: ${ZIndex.LAYER_1};
  height: 100%;
  width: 100%;
  margin: 0 auto;
`;

export const StyledReminderText = styled.div<{
  isEditing: boolean;
  textLength: number;
}>`
  font-family: "Caveat", cursive;
  font-size: ${(props) => {
    if (props.textLength > 100) return "22px";
    if (props.textLength > 50) return "24px";
    return "28px";
  }};
  background: ${({ theme }) =>
    `linear-gradient(90deg, ${theme.color.gradient.accentLight.start}, ${theme.color.gradient.accentLight.end})`};
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-align: center;
  font-weight: 600;
  filter: ${({ theme }) => `drop-shadow(0 0 2px ${theme.color.bg.primary})`};
  animation:
    ${fadeIn} 0.5s ease-out,
    ${subtle} 5s ease-in-out infinite,
    ${gradientWave} 15s ease infinite;
  cursor: ${({ isEditing }) => (isEditing ? "text" : "pointer")};
  min-width: 200px;
  max-width: 500px;
  position: relative;

  /* Animate drop-shadow color at 50% using bg.secondary */
  @media (prefers-reduced-motion: no-preference) {
    & {
      animation-name: ${fadeIn}, ${subtle}, ${gradientWave};
      animation-duration: 0.5s, 5s, 15s;
      animation-timing-function: ease-out, ease-in-out, ease;
      animation-iteration-count: 1, infinite, infinite;
    }
    /* Use a CSS animation step for 50% */
    @keyframes subtleShadowColor {
      0%,
      100% {
        filter: drop-shadow(0 0 2px ${theme.color.bg.primary});
      }
      50% {
        filter: drop-shadow(0 0 4px ${theme.color.bg.secondary});
      }
    }
    animation-name: subtleShadowColor, ${fadeIn}, ${gradientWave};
    animation-duration: 5s, 0.5s, 15s;
    animation-timing-function: ease-in-out, ease-out, ease;
    animation-iteration-count: infinite, 1, infinite;
  }

  ${({ isEditing }) =>
    isEditing
      ? css`
          outline: none;
          max-height: 80px;
          overflow-y: auto;
          white-space: pre-wrap;
          word-break: break-word;
          line-height: 1.3;
          padding: 0 10px;

          /* Limit to approximately 3 lines */
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        `
      : css`
          white-space: pre-wrap;
          word-break: break-word;
          line-height: 1.3;
          padding: 0 10px;
          max-width: 500px;
          max-height: 80px;
          overflow-y: auto;
        `}
`;

export const StyledReminderWrapper = styled.div`
  position: relative;
  display: inline-block;
  padding-bottom: 18px; /* Add padding to create space for the underline */
`;

export const StyledUnderline = styled.svg<{ isVisible: boolean }>`
  position: absolute;
  bottom: 0;
  left: -5px;
  width: calc(100% + 10px);
  height: 20px;
  pointer-events: none;
  opacity: ${({ isVisible }) => (isVisible ? 1 : 0)};

  path {
    fill: none;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 1000;
    stroke-dashoffset: ${({ isVisible }) => (isVisible ? 0 : 1000)};
    animation: ${({ isVisible }) =>
        isVisible ? drawHandwrittenUnderline : "none"}
      0.8s ease-out forwards;
  }
`;
