import tinycolor from "tinycolor2";

export const brighten = (color: string, amount?: number) => {
  return tinycolor(color).brighten(amount).toString();
};

export const darken = (color: string, amount?: number) => {
  return tinycolor(color).darken(amount).toString();
};

export const isDark = (color: string) => {
  return tinycolor(color).isDark();
};

export const hslToSpaceFormat = (hsl: string) => {
  return hsl
    .replace(/,/g, "")
    .replace(/%/g, "")
    .replace(/\s+/g, " ")
    .replace(/hsl\s*\((.*)\)/, "hsl($1)");
};
