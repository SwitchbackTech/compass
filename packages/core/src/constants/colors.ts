import { Priorities } from "@core/constants/core.constants";

export type Colors = {
  [key in ColorNames]: string;
};

export enum ColorNames {
  WHITE_1 = "white_1",
  WHITE_2 = "white_2",
  WHITE_3 = "white_3",
  WHITE_4 = "white_4",
  WHITE_5 = "white_5",
  WHITE_6 = "white_6",

  DARK_1 = "dark_1",
  DARK_2 = "dark_2",
  DARK_2_GREYED = "dark_2_greyed",
  DARK_3 = "dark_3",
  DARK_4 = "dark_4",
  DARK_5 = "dark_5",

  BLUE_1 = "blue_1",
  BLUE_2 = "blue_2",
  BLUE_3 = "blue_3",
  BLUE_3_BRIGHT = "blue_3_bright",
  BLUE_4 = "blue_4",
  BLUE_5 = "blue_5",

  TEAL_1 = "teal_1",
  TEAL_2 = "teal_2",
  TEAL_3 = "teal_3",
  TEAL_4 = "teal_4",
  TEAL_5 = "teal_5",

  GREY_1 = "grey_1",
  GREY_2 = "grey_2",
  GREY_3 = "grey_3",
  GREY_3_BRIGHT = "grey_3_bright",
  GREY_4 = "grey_4",
  GREY_4_BRIGHT = "grey_4_bright",
  GREY_5 = "grey_5",
  GREY_5_BRIGHT = "grey_5_bright",
  GREY_6 = "grey_6",
  GREY_7 = "grey_7",
  GREY_7_BRIGHT = "grey_7_bright",

  YELLOW_1 = "yellow_1",
  YELLOW_2 = "yellow_2",
  YELLOW_3 = "yellow_3",
  YELLOW_4 = "yellow_4",
  YELLOW_5 = "yellow_5",
}

export enum InvertedColorNames {
  BLUE_3 = "blue_3",
  GREY_3 = "grey_3",
  GREY_4 = "grey_4",
  TEAL_2 = "teal_2",
  WHITE_1 = "white_1",
}

export const colors: Colors = {
  [ColorNames.WHITE_1]: "#FFFFFF",
  [ColorNames.WHITE_2]: "#F3F2ED",
  [ColorNames.WHITE_3]: "#DBE0EB",
  [ColorNames.WHITE_4]: "#D9D9D9",
  [ColorNames.WHITE_5]: "#D5D5D5",
  [ColorNames.WHITE_6]: "#F5F5F5",

  [ColorNames.DARK_1]: "#0E1821",
  [ColorNames.DARK_2]: "#1C3142",
  [ColorNames.DARK_3]: "#516371",
  [ColorNames.DARK_4]: "#8293A1",
  [ColorNames.DARK_5]: "#C5D0D9",
  [ColorNames.DARK_2_GREYED]: "rgba(144, 144, 144, 0.2)",

  [ColorNames.BLUE_1]: "#1E2A4B",
  [ColorNames.BLUE_2]: "#3D5495",
  [ColorNames.BLUE_3]: "#5A7ED9",
  [ColorNames.BLUE_3_BRIGHT]: "#8EB1FF",
  [ColorNames.BLUE_4]: "#A5B7EA",
  [ColorNames.BLUE_5]: "#C4D1F5",
  [ColorNames.TEAL_1]: "#4b94a0",
  [ColorNames.TEAL_2]: "#4c96b3",
  [ColorNames.TEAL_3]: "#6cd7e9",
  [ColorNames.TEAL_4]: "#86D2ED",
  [ColorNames.TEAL_5]: "#ABE0F2",

  [ColorNames.GREY_1]: "#1D2932",
  [ColorNames.GREY_2]: "#395264",
  [ColorNames.GREY_3]: "#6796B8",
  [ColorNames.GREY_3_BRIGHT]: "#80B8E1",
  [ColorNames.GREY_4]: "#A3B1BB",
  [ColorNames.GREY_4_BRIGHT]: "#ABC7DC",
  [ColorNames.GREY_5]: "#BDCFDC",
  [ColorNames.GREY_5_BRIGHT]: "#F0FFFF",
  [ColorNames.GREY_6]: "#9CB6CB",
  [ColorNames.GREY_7]: "#7397B5",
  [ColorNames.GREY_7_BRIGHT]: "#A6CAE8",

  [ColorNames.YELLOW_1]: "#3F3C1F",
  [ColorNames.YELLOW_2]: "#7D793E",
  [ColorNames.YELLOW_3]: "#BCB55D",
  [ColorNames.YELLOW_4]: "#FAF17C",
  [ColorNames.YELLOW_5]: "#FCF8BD",
};

export const colorNameByPriority = {
  [Priorities.UNASSIGNED]: ColorNames.GREY_4,
  [Priorities.WORK]: ColorNames.GREY_3,
  [Priorities.SELF]: ColorNames.BLUE_3,
  [Priorities.RELATIONS]: ColorNames.TEAL_2,
};

export const GRID_LINE_OPACITY_PERCENT = 48;

export const invertedColors = {
  // priority colors (colorNameByPriority)
  [ColorNames.BLUE_3]: colors.blue_1,
  [ColorNames.GREY_3]: colors.dark_2,
  [ColorNames.GREY_4]: colors.grey_1,
  [ColorNames.TEAL_2]: colors.dark_2,

  // other
  [ColorNames.WHITE_1]: colors.white_3,
  [ColorNames.YELLOW_2]: colors.yellow_3,
};

export const linearGradient = `linear-gradient(90deg, ${colors.teal_3}, #4764CA)`;
