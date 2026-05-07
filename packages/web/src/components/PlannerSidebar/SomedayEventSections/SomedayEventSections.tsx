import { DragDropContext } from "@hello-pangea/dnd";
import { type FC, useRef } from "react";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import { useWeekLabel } from "@web/components/PlannerSidebar/SomedayEventSections/SomedayWeekSection/useWeekLabel";
import { selectIsGetSomedayEventsProcessing } from "@web/ducks/events/selectors/someday.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import {
  type Measurements_Grid,
  type Refs_Grid,
} from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { SomedayMonthSection } from "./SomedayMonthSection/SomedayMonthSection";
import { SomedayWeekSection } from "./SomedayWeekSection/SomedayWeekSection";

interface Props {
  dateCalcs?: DateCalcs;
  measurements?: Measurements_Grid;
  viewStart: WeekProps["component"]["startOfView"];
  viewEnd: WeekProps["component"]["endOfView"];
  gridRefs?: Refs_Grid;
}

export const SomedayEventSections: FC<Props> = ({
  dateCalcs,
  measurements,
  viewEnd,
  viewStart,
  gridRefs,
}) => {
  const isProcessing = useAppSelector(selectIsGetSomedayEventsProcessing);
  const context = useSidebarContext();
  const somedayRef = useRef<HTMLDivElement>(null);
  const weekLabel = useWeekLabel(viewStart, viewEnd);

  if (!context) return null; // TS Guard

  const { actions } = context;

  return (
    <div className="flex flex-col gap-6" ref={somedayRef}>
      {isProcessing && <AbsoluteOverflowLoader />}
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
          measurements={measurements}
          viewStart={viewStart}
          gridRefs={gridRefs}
        />
      </DragDropContext>
    </div>
  );
};
