import { Schema_Event } from "@core/types/event.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { SomedayEventsProps } from "@web/views/Calendar/hooks/draft/sidebar/useSidebar";

export interface WeekColProps {
  column: {
    id: string;
  };
  draft: Schema_GridEvent;
  events: Schema_Event[];
  isDraftingExisting: boolean;
  isDraftingNew: boolean;
  isOverGrid: boolean;
  util: SomedayEventsProps["util"];
}
