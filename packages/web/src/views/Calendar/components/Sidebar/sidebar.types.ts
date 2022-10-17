import { Priorities } from "@core/constants/core.constants";
export interface PriorityFilter {
  [Priorities.RELATIONS]?: boolean;
  [Priorities.WORK]?: boolean;
  [Priorities.SELF]?: boolean;
}
