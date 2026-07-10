import tinycolor from "tinycolor2";

export const brighten = (color: string, amount?: number) =>
  tinycolor(color).brighten(amount).toString();

export const darken = (color: string, amount?: number) =>
  tinycolor(color).darken(amount).toString();

export const isDark = (color: string) => tinycolor(color).isDark();
