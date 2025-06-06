import styled from "styled-components";
import { theme } from "@web/common/styles/theme";
import { blueGradient, getGradient } from "@web/common/styles/theme.util";

export interface Props {
  bgColor?: string;
  withBottomBorder?: boolean;
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
  ${({ withBottomBorder }) =>
    withBottomBorder && `border-bottom: 1px solid #5f5f5f;`}
  
  
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
