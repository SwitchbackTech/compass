import { Priorities } from "@core/constants/core.constants";

export function getPriorityBgColor(priority: Priorities): string {
  switch (priority) {
    case Priorities.WORK:
      return "border-blue-500/30 bg-blue-500/5";
    case Priorities.SELF:
      return "border-green-500/30 bg-green-500/5";
    case Priorities.RELATIONS:
      return "border-purple-500/30 bg-purple-500/5";
    default:
      return "border-gray-500/30 bg-gray-500/5";
  }
}
