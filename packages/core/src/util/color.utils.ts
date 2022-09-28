import { Priorities } from "@core/constants/core.constants";
import { colors, invertedColors } from "@core/constants/colors";
import { ColorNames, InvertedColorNames } from "@core/types/color.types";

export const getAlphaColor = (colorName: ColorNames, opacity: number) => {
  const _opacity = Math.round(Math.min(Math.max(opacity || 1, 0), 1) * 255);
  return getColor(colorName) + _opacity.toString(16).toUpperCase();
};

export const getBrighterColor = (colorName: ColorNames) => {
  // assumes that the higher the numbers are, the brighter the colors
  return colors[getNeighbourKey(colorName, colors, 1)] as string;
};

export const getColor = (colorName: ColorNames) => colors[colorName];

export const getDarkerColor = (colorName: ColorNames) => {
  return colors[getNeighbourKey(colorName, colors, -1) as ColorNames];
};

export const getInvertedColor = (colorName: InvertedColorNames) => {
  return invertedColors[colorName];
};

export const getNeighbourKey = (key = "", obj = {}, diff = 1): string => {
  const splitKeys = key.split("_");
  if (splitKeys.length < 1) {
    throw new Error(
      'You should provide object with keys "ANYTHING_KEY_NUMBER" where NUMBER is number'
    );
  }

  //@ts-ignore
  const index = +splitKeys[splitKeys.length - 1];
  const propName = splitKeys.filter((value) => value !== `${index}`).join("_");

  const neighbourIndex = index + diff;
  const neighbourKey = `${propName}_${neighbourIndex}`;

  return Object.keys(obj).find((_key) => _key === neighbourKey) || key;
};

export const hoverColorsByPriority = {
  [Priorities.UNASSIGNED]: "#F0FFFF",
  [Priorities.WORK]: "#80B8E1",
  [Priorities.RELATIONS]: "#86D2ED",
  [Priorities.SELF]: "#8EB1FF",
};
