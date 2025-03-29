import { Priorities } from "@core/constants/core.constants";
import { brighten, darken } from "@core/util/color.utils";
import { c } from "./colors";

const UNASSIGNED = c.blueGray400;
const WORK = c.blueGray100;
const RELATIONS = c.teal;
const SELF = c.blueGray200;

export const colorByPriority = {
  [Priorities.UNASSIGNED]: UNASSIGNED,
  [Priorities.WORK]: WORK,
  [Priorities.RELATIONS]: RELATIONS,
  [Priorities.SELF]: SELF,
};

export const darkBlueGradient = {
  level1: c.darkBlue400,
  level2: c.darkBlue400,
  level3: c.darkBlue200,
  level4: c.darkBlue300,
  level5: c.darkBlue400,
};

export const hoverColorByPriority = {
  [Priorities.UNASSIGNED]: brighten(c.blueGray400),
  [Priorities.WORK]: brighten(c.blueGray100),
  [Priorities.RELATIONS]: brighten(c.teal),
  [Priorities.SELF]: brighten(c.blueGray200),
};

export const gradientByPriority = {
  [Priorities.UNASSIGNED]: `linear-gradient(90deg, ${darken(
    UNASSIGNED,
    15,
  )}, ${darken(UNASSIGNED, 30)})`,
  [Priorities.WORK]: `linear-gradient(90deg, ${darken(WORK, 15)}, ${darken(
    WORK,
    30,
  )})`,
  [Priorities.RELATIONS]: `linear-gradient(90deg, ${darken(
    RELATIONS,
    15,
  )}, ${darken(RELATIONS, 30)})`,
  [Priorities.SELF]: `linear-gradient(90deg, ${darken(SELF, 15)}, ${darken(
    SELF,
    30,
  )})`,
};

export const blueGradient = `linear-gradient(${c.blue100}, ${c.blue300})`;
const grayGradient = `linear-gradient(90deg, ${c.gray100}, ${c.gray200})`;

export const getGradient = (color: string) => {
  const priority = Object.keys(colorByPriority).find(
    (key) => colorByPriority[key as Priorities] === color,
  ) as Priorities | undefined;

  return priority ? gradientByPriority[priority] : grayGradient;
};
