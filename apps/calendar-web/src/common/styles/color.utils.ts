import tinycolor from "tinycolor2";

export const brighten = (color: string, amount?: number) =>
  tinycolor(color).brighten(amount).toString();

export const darken = (color: string, amount?: number) =>
  tinycolor(color).darken(amount).toString();

export const desaturate = (color: string, amount?: number) =>
  tinycolor(color).desaturate(amount).toString();

/** Blend `color` toward `mixColor` by `amount` percent (0–100). */
export const mix = (color: string, mixColor: string, amount: number) =>
  tinycolor.mix(color, mixColor, amount).toString();

export const isDark = (color: string) => tinycolor(color).isDark();

// WCAG contrast ratio between two colors (1–21). Used to pick the more
// readable of two candidate text colors against a variable background.
export const readability = (color1: string, color2: string) =>
  tinycolor.readability(color1, color2);
