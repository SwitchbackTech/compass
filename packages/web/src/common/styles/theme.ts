import { isDark } from "@web/common/styles/color.utils";
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
  // Light text on dark backgrounds, dark text on light backgrounds.
  getContrastText: (backgroundColor: string): string =>
    isDark(backgroundColor) ? colors.text : colors.onAccent,
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
