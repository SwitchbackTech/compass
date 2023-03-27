import { Schema_Event } from "@core/types/event.types";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { Schema_GridEvent } from "@web/common/types/web.event.types";

import { SomedayEventsProps } from "../../../../hooks/draft/useSidebarDraft";

export interface WeekColProps {
  column: {
    id: string;
    title: string;
  };
  dateCalcs: DateCalcs;
  draft: Schema_GridEvent;
  draftId: string;
  events: Schema_Event[];
  isDraftingExisting: boolean;
  isDraftingNew: boolean;
  isOverGrid: boolean;
  measurements: Measurements_Grid;
  mouseCoords: { x: number; y: number };
  util: SomedayEventsProps["util"];
  viewStart: WeekProps["component"]["startOfView"];
}
