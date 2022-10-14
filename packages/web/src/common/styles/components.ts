import { ColorNames } from "@core/types/color.types";
import { getColor } from "@core/util/color.utils";

export interface BackgroundProps {
  bgColor?: string;
}

export interface ColorProps {
  color?: string;
  colorName?: ColorNames;
}

export type InputProps = ColorProps & BackgroundProps;

export const inputBaseStyles = ({ bgColor, colorName }: InputProps) => `
  background: ${bgColor};
  
  ::placeholder {
    color: ${getColor(colorName)}
  }
  `;
