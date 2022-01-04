import { Priorities } from "@web/common/types/entities";
import { ColorNames } from "@web/common/types/styles";

export const colors = {
  [ColorNames.WHITE_1]: "#FFFFFF",
  [ColorNames.WHITE_2]: "#F3F2ED",
  [ColorNames.WHITE_3]: "#DBE0EB",
  [ColorNames.WHITE_4]: "#D9D9D9",
  [ColorNames.WHITE_5]: "#F5F5F5",

  [ColorNames.DARK_1]: "#0E1821",
  [ColorNames.DARK_2]: "#1C3142",
  [ColorNames.DARK_3]: "#516371",
  [ColorNames.DARK_4]: "#8293A1",
  [ColorNames.DARK_5]: "#C5D0D9",

  [ColorNames.DARK_2_GREYED]: "rgba(144, 144, 144, 0.2)",

  [ColorNames.BLUE_1]: "#1E2A4B",
  [ColorNames.BLUE_2]: "#3D5495",
  [ColorNames.BLUE_3]: "#5B7EE0",
  [ColorNames.BLUE_3_BRIGHT]: "#8EB1FF",
  [ColorNames.BLUE_4]: "#A5B7EA",
  [ColorNames.BLUE_5]: "#C4D1F5",

  [ColorNames.TEAL_1]: "#053342",
  [ColorNames.TEAL_2]: "#2B8FB3",
  [ColorNames.TEAL_3]: "#50C4ED",
  [ColorNames.TEAL_4]: "#86D2ED",
  [ColorNames.TEAL_5]: "#ABE0F2",

  [ColorNames.GREY_1]: "#1D2932",
  [ColorNames.GREY_2]: "#395264",
  [ColorNames.GREY_3]: "#567B96",
  [ColorNames.GREY_4]: "#92A8B9",
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

export const invertedColors = {
  [ColorNames.BLUE_3]: colors.white_2,
  [ColorNames.DARK_5]: colors.dark_1,
  [ColorNames.DARK_2]: colors.white_3,

  [ColorNames.GREY_7]: colors.dark_1,
};

export const linearGradient = `linear-gradient(90deg, ${colors.teal_3}, #4764CA)`;

export const colorNameByPriority = {
  [Priorities.WORK]: ColorNames.DARK_5,
  [Priorities.SELF]: ColorNames.BLUE_3,
  [Priorities.RELATIONS]: ColorNames.GREY_7,
};
