import { Priorities } from "@core/constants/core.constants";

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

export const linearGradient = `linear-gradient(90deg, ${c.blue100}, ${c.blue500})`;
