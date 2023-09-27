import styled from "styled-components";
import { BASE_COLORS } from "@core/constants/colors";
import { InputProps, inputBaseStyles } from "@web/common/styles/components";

export enum Scale {
  SMALL = "small",
  MEDIUM = "medium",
  LARGE = "large",
}

export interface Props extends InputProps {
  scale?: Scale;
}

const heightByScale = {
  [Scale.LARGE]: 55,
  [Scale.MEDIUM]: 34,
  [Scale.SMALL]: 15,
};

const fontSizeByScale = {
  [Scale.LARGE]: 50,
  [Scale.MEDIUM]: 17,
  [Scale.SMALL]: 10,
};

export const StyledInput = styled.input<Props>`
  border: none;
  color: ${BASE_COLORS.DEEP_BLUE};
  height: ${({ scale = Scale.MEDIUM }) => heightByScale[scale]}px;
  font-size: ${({ scale = Scale.MEDIUM }) => fontSizeByScale[scale]}px;
  outline: none;
  width: 100%;

  ${inputBaseStyles}

  &:hover {
    filter: brightness(87%);
  }
`;
