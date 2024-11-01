import styled from "styled-components";
import { linearGradient } from "@web/common/styles/theme.util";

export interface Props {
  bgColor?: string;
  color?: string;
  cursor?: string;
  fontWeight?: number | "normal" | "bold" | "bolder" | "lighter";
  lineHeight?: number;
  size?: number;
  withGradient?: boolean;
  withUnderline?: boolean;
  zIndex?: number;
}

export const StyledText = styled.span<Props>`
  ${({ color }) => color && `color: ${color};`}
  ${({ cursor }) => cursor && `cursor: ${cursor};`}
  ${({ lineHeight }) => lineHeight && `line-height: ${lineHeight}px;`}
  ${({ size }) => size && `font-size: ${size}px;`}

  font-weight: ${({ fontWeight = "normal" }) => fontWeight};
  position: relative;

  ${({ withGradient }) =>
    withGradient &&
    `
  color: transparent;
  background: ${linearGradient};
  background-clip: text;
  -webkit-background-clip: text; 
  `}

  ${({ withUnderline = false, cursor }) =>
    withUnderline &&
    `
    cursor: ${cursor || "pointer"};
    &:hover {
      &::after {
        content: ' ';
        background: ${linearGradient};
        position: absolute;
        width: 100%;
        height: 2px;
        left: 0;
        bottom: 0;
      }
    }
  `}
  ${({ zIndex }) => zIndex && `z-index: ${zIndex}`}
`;
