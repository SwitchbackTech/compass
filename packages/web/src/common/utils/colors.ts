import { colors, invertedColors } from "@web/common/styles/colors";
import { ColorNames, InvertedColorNames } from "@web/common/types/styles";

export const getAlphaColor = (colorName: ColorNames, opacity: number) => {
  const _opacity = Math.round(Math.min(Math.max(opacity || 1, 0), 1) * 255);
  return getColor(colorName) + _opacity.toString(16).toUpperCase();
};

export const getBrighterColor = (colorName: ColorNames) => {
  return colors[getNeighbourKey(colorName, colors, 1) as ColorNames];
};

export const getColor = (colorName: ColorNames) => colors[colorName];

export const getDarkerColor = (colorName: ColorNames) => {
  return colors[getNeighbourKey(colorName, colors, -1) as ColorNames];
};

export const getInvertedColor = (colorName: InvertedColorNames) => {
  return invertedColors[colorName];
};

const getNeighbourKey = (key = "", obj = {}, diff = 1): string => {
  const splittedKey = key.split("_");
  if (splittedKey.length < 1) {
    throw new Error(
      'You should provide object with keys "ANYTHING_KEY_NUMBER" where NUMBER is number'
    );
  }

  const index = +splittedKey[splittedKey.length - 1];
  const propName = splittedKey
    .filter((value) => value !== `${index}`)
    .join("_");

  const neighbourIndex = index + diff;
  const neighbourKey = `${propName}_${neighbourIndex}`;
  // console.log(
  // `${key}: ${Object.keys(obj).find((_key) => _key === neighbourKey) || key}`
  // );
  return Object.keys(obj).find((_key) => _key === neighbourKey) || key;
};
