import { ColorNames, InvertedColorNames } from "@core/constants/colors";
import { getColor, getInvertedColor } from "@core/util/color.utils";

export interface BackgroundProps {
  background?: ColorNames;
}

export interface ColorProps {
  colorName?: ColorNames;
}

export type ColorNameAndBackgroundProps = ColorProps & BackgroundProps;

export const getInputCommonStyles = ({
  background,
  colorName,
}: ColorNameAndBackgroundProps) => `
  background: ${getColor(background)};
  color: ${
    colorName
      ? getColor(colorName)
      : getInvertedColor(background as unknown as InvertedColorNames)
  };
  ::placeholder {
    color: ${getColor(colorName)}
  }
`;
