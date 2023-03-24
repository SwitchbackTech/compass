import { Schema_Event } from "@core/types/event.types";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";

import { SomedayEventsProps } from "../hooks/useSomedayEvents";

export interface WeekColProps {
  column: {
    id: string;
    title: string;
  };
  dateCalcs: DateCalcs;
  draftId: string;
  draggingDraft: Schema_Event;
  events: Schema_Event[];
  isDrafting: boolean;
  isOverGrid: boolean;
  measurements: Measurements_Grid;
  mouseCoords: { x: number; y: number };
  util: SomedayEventsProps["util"];
  viewStart: WeekProps["component"]["startOfView"];
}
