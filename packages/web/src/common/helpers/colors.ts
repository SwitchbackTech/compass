import { colors, invertedColors } from '@common/styles/colors';
import { ColorNames, InvertedColorNames } from '@common/types/styles';

export const getColor = (colorName: ColorNames) => colors[colorName];

export const getInvertedColor = (colorName: InvertedColorNames) =>
  invertedColors[colorName] || colors.blue_3;

const getNeighbourKey = (key = '', obj = {}, diff = 1): string => {
  const splittedKey = key.split('_');
  if (splittedKey.length < 1) {
    throw new Error(
      'You should provide object with keys "ANYTHING_KEY_NUMBER" where NUMBER is number'
    );
  }

  const index = +splittedKey[splittedKey.length - 1];
  const propName = splittedKey
    .filter((value) => value !== `${index}`)
    .join('_');

  const neighbourIndex = index + diff;
  const neighbourKey = `${propName}_${neighbourIndex}`;

  return Object.keys(obj).find((_key) => _key === neighbourKey) || key;
};

export const getDarkerColor = (colorName: ColorNames) =>
  colors[getNeighbourKey(colorName, colors, -1) as ColorNames];

export const getBrighterColor = (colorName: ColorNames) =>
  colors[getNeighbourKey(colorName, colors, 1) as ColorNames];

export const getAlphaColor = (colorName: ColorNames, opacity: number) => {
  const _opacity = Math.round(Math.min(Math.max(opacity || 1, 0), 1) * 255);
  return getColor(colorName) + _opacity.toString(16).toUpperCase();
};
