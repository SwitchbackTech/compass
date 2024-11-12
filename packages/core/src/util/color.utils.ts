import tinycolor from "tinycolor2";

export const brighten = (color: string, amount?: number) => {
  return tinycolor(color).brighten(amount).toString();
};

export const darken = (color: string, amount?: number) => {
  return tinycolor(color).darken(amount).toString();
};
