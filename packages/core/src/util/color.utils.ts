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

/**
 * generateCalendarColorScheme
 *
 * Generates a calendar color scheme ensuring accessibility.
 * The background color is either the provided color or a random color.
 * The text color is chosen using tinycolor's mostReadable algorithm,
 * which selects the most readable color from a set of related colors
 * (triad, tetrad, monochromatic) based on WCAG AA level for small text.
 * This ensures sufficient contrast for accessibility.
 */
export const generateCalendarColorScheme = (
  color?: string,
): Record<"backgroundColor" | "color", string> => {
  const base = color ? tinycolor(color) : tinycolor.random();

  return {
    backgroundColor: base.toHexString(),
    color: tinycolor
      .mostReadable(
        base,
        [...base.triad(), ...base.tetrad(), ...base.monochromatic()],
        {
          includeFallbackColors: true,
          level: "AA",
          size: "small",
        },
      )
      .toHexString(),
  };
};
