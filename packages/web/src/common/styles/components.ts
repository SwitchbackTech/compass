import { ColorNames, InvertedColorNames } from "@web/common/types/styles";
import { getColor, getInvertedColor } from "@web/common/utils/colors";

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
