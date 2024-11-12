import styled from "styled-components";
import { getGradient, blueGradient } from "@web/common/styles/theme.util";
import { theme } from "@web/common/styles/theme";

export interface Props {
  bgColor?: string;
  color?: string;
  cursor?: string;
  fontWeight?: number | "normal" | "bold" | "bolder" | "lighter";
  lineHeight?: number;
  size?: FontSize;
  withGradient?: boolean;
  withUnderline?: boolean;
  zIndex?: number;
}

type FontSize = "xs" | "s" | "m" | "l" | "xl" | "xxl" | "xxxl" | "4xl" | "5xl";

export const StyledText = styled.span<Props>`
  ${({ color }) => color && `color: ${color};`}
  ${({ cursor }) => cursor && `cursor: ${cursor};`}
  ${({ lineHeight }) => lineHeight && `line-height: ${lineHeight}px;`}
  ${({ size }) => size && `font-size: ${theme.text.size[size]};`} 
  
  font-weight: ${({ fontWeight = "normal" }) => fontWeight};
  position: relative;

  ${({ withGradient }) =>
    withGradient &&
    `
  color: transparent;
  background: ${blueGradient};
  background-clip: text;
  -webkit-background-clip: text; 
  `}

  ${({ color, cursor, withUnderline = false }) =>
    withUnderline &&
    `
    cursor: ${cursor || "pointer"};
    &:hover {
      &::after {
        content: ' ';
        background: ${getGradient(color)};
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
