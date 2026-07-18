import { readability } from "@web/common/styles/color.utils";
import { colors } from "@web/common/styles/colors";

export const theme = {
  text: {
    size: {
      xs: "0.563rem",
      s: "0.688rem",
      m: "0.8125rem",
      l: "1rem",
      xl: "1.125rem",
      xxl: "1.3rem",
      xxxl: "1.6rem",
      "4xl": "1.7rem",
      "5xl": "2rem",
    },
    weight: {
      light: 300,
      regular: 400,
      medium: 500,
      bold: 700,
      extraBold: 900,
    },
  },
  // Return whichever text token actually has the higher contrast against the
  // background. A brightness threshold misfires on mid-tone fills, where the
  // "lighter" side is still too dark for light text (and vice versa).
  getContrastText: (backgroundColor: string): string =>
    readability(colors.onAccent, backgroundColor) >=
    readability(colors.text, backgroundColor)
      ? colors.onAccent
      : colors.text,
  transition: {
    default: "0.3s",
  },
  shape: {
    borderRadius: "4px",
  },
  spacing: {
    xs: "4px",
    s: "8px",
    m: "16px",
    l: "24px",
    xl: "32px",
  },
};
