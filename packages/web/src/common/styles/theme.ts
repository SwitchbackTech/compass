import { DefaultTheme } from "styled-components";
import { Priorities } from "@core/constants/core.constants";

const blue500 = "hsl(210 100 63 / 12.94%)";
const blue400 = "hsl(210 100 63 / 30.2%)";
const blue300 = "hsl(195 78 56)";
const blue200 = "hsl(202 100 67)";
const blue100 = "hsl(210 100 73)";
const orange500 = "hsl(25 100 63)";
const orange400 = "hsl(20 84 68)";
const orange300 = "hsl(34 100 66)";
const orange200 = "hsl(40 75 61)";
const orange100 = "hsl(35 70 68)";
const red500 = "hsl(0 63 60)";
const red400 = "hsl(357 81 69)";
const red300 = "hsl(355 84 69)";
const green500 = "hsl(105 61 62)";
const green400 = "hsl(80 65 57)";
const green300 = "hsl(160 62 74)";
const purple500 = "hsl(269 18 43 / 40%)";
const purple400 = "hsl(269 18 43)";
const purple300 = "hsl(270 100 83)";
const darkBlue500 = "hsl(220 29 6)";
const darkBlue400 = "hsl(222 28 7)";
const darkBlue300 = "hsl(218 27 8)";
const darkBlue200 = "hsl(218 24 9)";
const darkBlue100 = "hsl(223 27 10)";
const gray900 = "hsl(0 0 0 / 50.2%)";
const gray800 = "hsl(219 18 34 / 20%)";
const gray700 = "hsl(219 18 34 25.1%)";
const gray600 = "hsl(219 8 46 / 20%)";
const gray500 = "hsl(219 8 46 / 20%)";
const gray400 = "hsl(221 9 37)";
const gray300 = "hsl(219 8 46 / 90.2%)";
const gray200 = "hsl(208 13 71 / 54.9%)";
const gray100 = "hsl(47 7 73)";
const white300 = "hsl(180 100% 97%)";
const white200 = "hsl(0 0 98)";
const white100 = "hsl(0 0 100)";
const black300 = "hsla(0 0 0 / 25%)";

export const darkBlueGradient = {
  level1: darkBlue400,
  level2: darkBlue400,
  level3: darkBlue200,
  level4: darkBlue300,
  level5: darkBlue400,
};

//TODO rename to hoverColor
export const hoverColorsByPriority = {
  [Priorities.UNASSIGNED]: white200,
  [Priorities.WORK]: green400,
  [Priorities.RELATIONS]: orange300,
  [Priorities.SELF]: blue200,
};

export const colorByPriority = {
  [Priorities.UNASSIGNED]: gray100,
  [Priorities.WORK]: green500,
  [Priorities.RELATIONS]: orange500,
  [Priorities.SELF]: blue300,
};

export const GRID_LINE_OPACITY_PERCENT = 48;

export const linearGradient = `linear-gradient(90deg, ${blue100}, ${blue400})`;

export const theme: DefaultTheme = {
  color: {
    bg: {
      primary: darkBlue400,
      secondary: darkBlue200,
    },
    border: {
      primary: gray800,
      primaryDark: gray900,
      secondary: gray700,
    },
    fg: {
      primary: gray100,
    },
    panel: {
      bg: gray600,
      scrollbar: gray500,
      scrollbarActive: gray400,
      shadow: gray400,
      text: white200,
    },
    shadow: {
      default: black300,
    },
    status: {
      success: green500,
      error: red500,
      warning: orange500,
      info: blue200,
    },
    tag: {
      one: blue300,
      two: green500,
      three: purple300,
    },
    text: {
      accent: blue200,
      light: gray100,
      lighter: white100,
      lightInactive: white200,
      dark: darkBlue400,
      darkPlaceholder: gray300,
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
