import { ColorNames, InvertedColorNames } from "@web/common/types/styles";
import { getColor, getInvertedColor } from "@web/common/helpers/colors";

export interface BackgroundProps {
  background?: ColorNames;
}

export interface ColorProps {
  colorName?: ColorNames;
}

export type ColorNameAndBackgroundProps = ColorProps & BackgroundProps;

export const getInputCommonStyles = ({
  background = ColorNames.BLUE_3,
  colorName,
}: ColorNameAndBackgroundProps) => `
  background: ${getColor(background)};
  color: ${
    colorName
      ? getColor(colorName)
      : getInvertedColor(background as unknown as InvertedColorNames)
  };
  
  ${
    background === ColorNames.BLUE_3
      ? `&::placeholder {
    color: ${getColor(ColorNames.GREY_5)}
  }`
      : ""
  }
`;
