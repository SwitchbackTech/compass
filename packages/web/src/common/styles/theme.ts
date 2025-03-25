import { DefaultTheme } from "styled-components";

export const c = {
  black: "hsla(0 0 0 / 25%)",
  blue300: "hsl(195 78 56)",
  blue200: "hsl(196 60 59)",
  blue100: "hsl(202 100 67)",
  blueGray400: "hsl(207 14 57)",
  blueGray300: "hsl(205 33 61)",
  blueGray200: "hsl(205 36 62)",
  blueGray100: "hsl(196 45 78)",
  darkBlue500: "hsl(220 29 6)",
  darkBlue400: "hsl(222 28 7)",
  darkBlue300: "hsl(218 27 8)",
  darkBlue200: "hsl(218 24 9)",
  darkBlue100: "hsl(223 27 10)",
  gray900: "hsl(0 0 0 / 50.2%)",
  gray800: "hsl(219 18 34 / 20%)",
  gray700: "hsl(219 18 34 25.1%)",
  gray600: "hsl(219 8 46 / 20%)",
  gray500: "hsl(219 8 46 / 20%)",
  gray400: "hsl(221 9 37)",
  gray300: "hsl(219 8 46 / 90.2%)",
  gray200: "hsl(208 13 71 / 54.9%)",
  gray100: "hsl(47 7 73)",
  green: "hsl(105 61 62)",
  orange: "hsl(25 100 63)",
  purple: "hsl(270 100 83)",
  red: "hsl(0 63 60)",
  teal: "hsl(163 44 67)",
  white200: "hsl(0 0 98)",
  white100: "hsl(0 0 100)",
};

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
      light: c.gray100,
      lighter: c.white100,
      lightInactive: c.gray200,
      dark: c.darkBlue400,
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
