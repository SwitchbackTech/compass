import styled from 'styled-components';

import { linearGradient } from '@common/styles/colors';
import { BackgroundProps, ColorProps } from '@common/styles/components';
import { getColor } from '@common/helpers/colors';

export interface Props extends BackgroundProps, ColorProps {
  size?: number;
  lineHeight?: number;
  fontWeight?: number | 'normal' | 'bold' | 'bolder' | 'lighter';
  withUnderline?: boolean;
  cursor?: string;
}

export const Styled = styled.span<Props>`
  ${({ colorName }) => colorName && `color ${getColor(colorName)};`}
  ${({ size }) => size && `font-size: ${size}px;`}
  ${({ lineHeight }) => lineHeight && `line-height: ${lineHeight}px;`}
  font-weight: ${({ fontWeight = 'normal' }) => fontWeight};
  ${({ cursor }) => cursor && `cursor: ${cursor};`}
  position: relative;

  ${({ withUnderline = false, cursor }) =>
    withUnderline &&
    `
    cursor: ${cursor || 'pointer'};
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
`;
