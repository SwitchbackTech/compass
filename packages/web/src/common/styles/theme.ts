import { DefaultTheme } from "styled-components";
import { c, textDark, textLight } from "./colors";

export const theme: DefaultTheme = {
  color: {
    bg: {
      primary: c.darkBlue400,
      secondary: c.darkBlue200,
    },
    border: {
      primary: c.gray800,
      primaryDark: c.gray900,
      secondary: c.gray100,
    },
    fg: {
      primary: c.gray100,
      primaryDark: c.gray200,
    },
    gridLine: {
      primary: c.gray800,
    },
    menu: {
      bg: c.white200,
    },
    panel: {
      bg: c.gray600,
      scrollbar: c.gray500,
      scrollbarActive: c.gray400,
      shadow: c.gray400,
      text: c.white200,
    },
    shadow: {
      default: c.black,
    },
    status: {
      success: c.green,
      error: c.red,
      warning: c.orange,
      info: c.blue100,
    },
    tag: {
      one: c.blue100,
      two: c.green,
      three: c.purple,
    },
    text: {
      accent: c.blue100,
      light: textLight,
      lighter: c.white100,
      lightInactive: c.gray200,
      dark: textDark,
      darkPlaceholder: c.gray300,
    },
  },
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
  getContrastText: (
    backgroundColor: string,
  ): typeof textLight | typeof textDark => {
    // Convert hex to RGB
    const hex = backgroundColor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate relative luminance using WCAG formula
    // https://www.w3.org/TR/WCAG20-TECHS/G17.html
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Use white text on dark backgrounds, black text on light backgrounds
    return luminance > 0.5 ? textDark : textLight;
  },
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
