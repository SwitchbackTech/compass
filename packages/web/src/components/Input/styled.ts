import styled from 'styled-components';

import {
  ColorNameAndBackgroundProps,
  getInputCommonStyles,
} from '@common/styles/components';

export enum Scale {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

export interface Props extends ColorNameAndBackgroundProps {
  scale?: Scale;
}

const heightByScale = {
  [Scale.LARGE]: 55,
  [Scale.MEDIUM]: 40,
  [Scale.SMALL]: 15,
};

const fontSizeByScale = {
  [Scale.LARGE]: 50,
  [Scale.MEDIUM]: 20,
  [Scale.SMALL]: 10,
};

export const Styled = styled.input<Props>`
  height: ${({ scale = Scale.MEDIUM }) => heightByScale[scale]}px;
  font-size: ${({ scale = Scale.MEDIUM }) => fontSizeByScale[scale]}px;
  border: none;
  outline: none;
  font-weight: 600;
  width: 100%;
  ${getInputCommonStyles}
`;
