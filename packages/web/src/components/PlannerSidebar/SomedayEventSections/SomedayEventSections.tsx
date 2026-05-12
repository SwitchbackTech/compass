import { DragDropContext } from "@hello-pangea/dnd";
import { type FC, useRef } from "react";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import { useWeekLabel } from "@web/components/PlannerSidebar/SomedayEventSections/SomedayWeekSection/useWeekLabel";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import {
  type Measurements_Grid,
  type Refs_Grid,
} from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { SomedayMonthSection } from "./SomedayMonthSection/SomedayMonthSection";
import { SomedayWeekSection } from "./SomedayWeekSection/SomedayWeekSection";

interface Props {
  calendarDate: WeekProps["component"]["startOfView"];
  dateCalcs?: DateCalcs;
  measurements?: Measurements_Grid;
  viewStart: WeekProps["component"]["startOfView"];
  viewEnd: WeekProps["component"]["endOfView"];
  gridRefs?: Refs_Grid;
}

export const SomedayEventSections: FC<Props> = ({
  calendarDate,
  dateCalcs,
  measurements,
  viewEnd,
  viewStart,
  gridRefs,
}) => {
  const { actions } = useSidebarContext();
  const somedayRef = useRef<HTMLDivElement>(null);
  const weekLabel = useWeekLabel(viewStart, viewEnd);

  return (
    <div className="flex flex-col gap-6" ref={somedayRef}>
      <DragDropContext
        onDragEnd={actions.onDragEnd}
        onDragStart={actions.onDragStart}
      >
        <SomedayWeekSection
          dateCalcs={dateCalcs}
          measurements={measurements}
          viewStart={viewStart}
          weekLabel={weekLabel}
          gridRefs={gridRefs}
        />

        <SomedayMonthSection
          dateCalcs={dateCalcs}
          monthDate={calendarDate}
          measurements={measurements}
          viewStart={viewStart}
          gridRefs={gridRefs}
        />
      </DragDropContext>
    </div>
  );
};
