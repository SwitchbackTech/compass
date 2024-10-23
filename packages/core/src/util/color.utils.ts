import tinycolor from "tinycolor2";
import { BASE_COLORS, ColorHex, OLDcolors } from "@core/constants/colors";
import { ColorNames, InvertedColorNames } from "@core/types/color.types";

export const brighten = (color: string) => {
  return tinycolor(color).brighten().toString();
};

export const darken = (color: string) => {
  return tinycolor(color).darken().toString();
};

export const getAlphaColor = (colorName: ColorNames, opacity: number) => {
  const _opacity = Math.round(Math.min(Math.max(opacity || 1, 0), 1) * 255);
  return getColor(colorName) + _opacity.toString(16).toUpperCase();
};

export const getColor = (colorName: ColorNames) =>
  OLDcolors[colorName] as ColorHex;

export const getDarkerColor = (colorName: ColorNames) => {
  return OLDcolors[getNeighbourKey(colorName, OLDcolors, -1) as ColorNames];
};

export const getInvertedColor = (colorName: InvertedColorNames) => {
  const invertedColors = {
    // priority colors
    [ColorNames.GREY_4]: BASE_COLORS.ONYX_GREY,
    [ColorNames.BLUE_7]: BASE_COLORS.ONYX_GREY,
    [ColorNames.BLUE_5]: BASE_COLORS.DEEP_BLUE,
    [ColorNames.TEAL_2]: BASE_COLORS.DEEP_BLUE,
    // other
    [ColorNames.WHITE_1]: OLDcolors.white_3,
    [ColorNames.YELLOW_2]: OLDcolors.yellow_3,
  };
  //@ts-ignore
  return invertedColors[colorName] as string;
};

export const getNeighbourKey = (key = "", obj = {}, diff = 1) => {
  const splitKeys = key.split("_");
  if (splitKeys === undefined || splitKeys.length < 1) {
    throw new Error(
      'You should provide object with keys "ANYTHING_KEY_NUMBER" where NUMBER is number'
    );
  }

  const prev = splitKeys.length - 1;
  //@ts-ignore
  const index = +splitKeys[prev];
  const propName = splitKeys.filter((value) => value !== `${index}`).join("_");

  const neighbourIndex = index + diff;
  const neighbourKey = `${propName}_${neighbourIndex}`;

  return Object.keys(obj).find((_key) => _key === neighbourKey) || key;
};
