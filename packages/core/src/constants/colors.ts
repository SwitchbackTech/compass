import { Priorities } from "@core/constants/core.constants";
import { Colors, ColorNames } from "@core/types/color.types";

export type ColorHex = keyof typeof colors;

export const BASE_COLORS = {
  DEEP_BLUE: "#1C3142",
  ONYX_GREY: "#1D2932",
  SLATE_GREY: "#BDCFDC",
  LIGHT_GREY: "#8293A1",
};

export const colors: Colors = {
  [ColorNames.BLUE_1]: "#0E1821",
  [ColorNames.BLUE_2]: BASE_COLORS.DEEP_BLUE,
  [ColorNames.BLUE_3]: "#1E2A4B",
  [ColorNames.BLUE_4]: "#3D5495",
  [ColorNames.BLUE_5]: "#5A7ED9",
  [ColorNames.BLUE_6]: "#7397B5",
  [ColorNames.BLUE_7]: "#6796B8",
  [ColorNames.BLUE_8]: "#94c5e9",

  [ColorNames.GREY_1]: BASE_COLORS.ONYX_GREY,
  [ColorNames.GREY_2]: "#395264",
  [ColorNames.GREY_3]: "#516371",
  [ColorNames.GREY_4]: "#A3B1BB",
  [ColorNames.GREY_5]: "#BDCFDC",
  [ColorNames.GREY_6]: "#7A858D",

  [ColorNames.TEAL_1]: "#4b94a0",
  [ColorNames.TEAL_2]: "#4c96b3",
  [ColorNames.TEAL_3]: "#6cd7e9",
  [ColorNames.TEAL_4]: "#86D2ED",
  [ColorNames.TEAL_5]: "#ABE0F2",

  [ColorNames.WHITE_1]: "#D9D9D9",
  [ColorNames.WHITE_2]: "#D5D5D5",
  [ColorNames.WHITE_3]: "#FFFFFF",
  [ColorNames.WHITE_4]: "#F3F2ED",
  [ColorNames.WHITE_5]: "#F5F5F5",

  [ColorNames.YELLOW_1]: "#3F3C1F",
  [ColorNames.YELLOW_2]: "#7D793E",
  [ColorNames.YELLOW_3]: "#BCB55D",
  [ColorNames.YELLOW_4]: "#FAF17C",
  [ColorNames.YELLOW_5]: "#FCF8BD",
};

export const colorNameByPriority = {
  [Priorities.UNASSIGNED]: ColorNames.GREY_4,
  [Priorities.WORK]: ColorNames.BLUE_7,
  [Priorities.SELF]: ColorNames.BLUE_5,
  [Priorities.RELATIONS]: ColorNames.TEAL_2,
};

export const GRID_LINE_OPACITY_PERCENT = 48;

export const invertedColors = {
  // priority colors
  [ColorNames.GREY_4]: BASE_COLORS.ONYX_GREY,
  [ColorNames.BLUE_7]: BASE_COLORS.ONYX_GREY,
  [ColorNames.BLUE_5]: BASE_COLORS.DEEP_BLUE,
  [ColorNames.TEAL_2]: BASE_COLORS.DEEP_BLUE,
  // other
  [ColorNames.WHITE_1]: colors.white_3,
  [ColorNames.YELLOW_2]: colors.yellow_3,
};

export const linearGradient = `linear-gradient(90deg, ${colors.teal_3}, #4764CA)`;
