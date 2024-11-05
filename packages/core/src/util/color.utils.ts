import tinycolor from "tinycolor2";

export const brighten = (color: string, amount?: number) => {
  return tinycolor(color).brighten(amount).toString();
};

export const darken = (color: string, amount?: number) => {
  return tinycolor(color).darken(amount).toString();
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
