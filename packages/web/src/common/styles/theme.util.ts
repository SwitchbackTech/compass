import { Priorities } from "@core/constants/core.constants";
import { darken } from "@core/util/color.utils";

import { c } from "./theme";

export const colorByPriority = {
  [Priorities.UNASSIGNED]: c.gray100,
  [Priorities.WORK]: c.green500,
  [Priorities.RELATIONS]: c.orange500,
  [Priorities.SELF]: c.blue300,
};

export const darkBlueGradient = {
  level1: c.darkBlue400,
  level2: c.darkBlue400,
  level3: c.darkBlue200,
  level4: c.darkBlue300,
  level5: c.darkBlue400,
};

export const hoverColorByPriority = {
  [Priorities.UNASSIGNED]: c.white200,
  [Priorities.WORK]: c.green400,
  [Priorities.RELATIONS]: c.orange300,
  [Priorities.SELF]: c.blue200,
};

export const gradientByPriority = {
  [Priorities.UNASSIGNED]: `linear-gradient(90deg, ${darken(
    c.gray400
  )}, ${darken(c.gray100)})`,
  [Priorities.WORK]: `linear-gradient(90deg, ${darken(c.green500)}, ${darken(
    c.green300
  )})`,
  [Priorities.RELATIONS]: `linear-gradient(90deg, ${darken(
    c.orange500
  )}, ${darken(c.orange300)})`,
  [Priorities.SELF]: `linear-gradient(90deg, ${darken(c.blue500)}, ${darken(
    c.blue200
  )})`,
};

export const defaultGradient = `linear-gradient(90deg, ${c.blue100}, ${c.blue500})`;

export const getGradient = (color: string) => {
  const priority = Object.keys(colorByPriority).find(
    (key) => colorByPriority[key as Priorities] === color
  ) as Priorities | undefined;

  return priority ? gradientByPriority[priority] : defaultGradient;
  // TODO remove
  //   return priority
  //     ? gradientByPriority[priority]
  //     : `linear-gradient(90deg, ${c.gray100}, ${c.gray200})}`;
};
