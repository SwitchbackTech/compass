import styled from "styled-components";
import { linearGradient } from "@core/constants/colors";
import { BackgroundProps, ColorProps } from "@web/common/styles/components";
import { getColor } from "@core/util/color.utils";

export interface Props extends BackgroundProps, ColorProps {
  cursor?: string;
  fontWeight?: number | "normal" | "bold" | "bolder" | "lighter";
  lineHeight?: number;
  size?: number;
  withUnderline?: boolean;
  zIndex?: number;
}

export const StyledText = styled.span<Props>`
  ${({ colorName }) => colorName && `color ${getColor(colorName)};`}
  ${({ cursor }) => cursor && `cursor: ${cursor};`}
  font-weight: ${({ fontWeight = "normal" }) => fontWeight};
  ${({ lineHeight }) => lineHeight && `line-height: ${lineHeight}px;`}
  position: relative;
  ${({ size }) => size && `font-size: ${size}px;`}

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
