import { Priorities } from "@core/constants/core.constants";
export interface FutureEventsProps {
  shouldSetTopMargin?: boolean;
}
export interface PriorityFilter {
  [Priorities.RELATIONS]?: boolean;
  [Priorities.WORK]?: boolean;
  [Priorities.SELF]?: boolean;
}
export interface SidebarProps {
  isToggled: boolean;
}
export interface SectionProps {
  height?: string;
}
