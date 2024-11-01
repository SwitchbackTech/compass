import { DefaultTheme } from "styled-components";

export const c = {
  blue500: "hsl(210 100 63 / 90%)",
  blue400: "hsl(210 100 63)",
  blue300: "hsl(195 78 56)",
  blue200: "hsl(202 100 67)",
  blue100: "hsl(210 100 73)",
  orange500: "hsl(25 100 63)",
  orange400: "hsl(20 84 68)",
  orange300: "hsl(34 100 66)",
  orange200: "hsl(40 75 61)",
  orange100: "hsl(35 70 68)",
  red500: "hsl(0 63 60)",
  red400: "hsl(357 81 69)",
  red300: "hsl(355 84 69)",
  green500: "hsl(105 61 62)",
  green400: "hsl(80 65 57)",
  green300: "hsl(160 62 74)",
  purple500: "hsl(269 18 43 / 40%)",
  purple400: "hsl(269 18 43)",
  purple300: "hsl(270 100 83)",
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
  white300: "hsl(180 100% 97%)",
  white200: "hsl(0 0 98)",
  white100: "hsl(0 0 100)",
  black300: "hsla(0 0 0 / 25%)",
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
      secondary: c.gray700,
    },
    fg: {
      primary: c.gray100,
    },
    panel: {
      bg: c.gray600,
      scrollbar: c.gray500,
      scrollbarActive: c.gray400,
      shadow: c.gray400,
      text: c.white200,
    },
    shadow: {
      default: c.black300,
    },
    status: {
      success: c.green500,
      error: c.red500,
      warning: c.orange500,
      info: c.blue200,
    },
    tag: {
      one: c.blue300,
      two: c.green500,
      three: c.purple300,
    },
    text: {
      accent: c.blue200,
      light: c.gray100,
      lighter: c.white100,
      lightInactive: c.gray200,
      dark: c.darkBlue400,
      darkPlaceholder: c.gray300,
    },
  },
  text: {
    default: "0.8125rem",
    medium: "1rem",
  },
  transition: {
    default: "0.3s",
  },
};
