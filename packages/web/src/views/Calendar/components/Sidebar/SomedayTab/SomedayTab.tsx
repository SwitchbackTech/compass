import React, { FC, useRef } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { theme } from "@web/common/styles/theme";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { Divider } from "@web/components/Divider";
import { selectIsGetSomedayEventsProcessing } from "@web/ducks/events/selectors/someday.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useSidebarContext } from "@web/views/Calendar/components/Draft/sidebar/context/useSidebarContext";
import { useWeekLabel } from "@web/views/Calendar/components/Sidebar/SomedayTab/WeekSection/useWeekLabel";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import {
  Measurements_Grid,
  Refs_Grid,
} from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { MonthSection } from "./MonthSection/MonthSection";
import { WeekSection } from "./WeekSection/WeekSection";
import { SidebarContent } from "./styled";

interface Props {
  dateCalcs: DateCalcs;
  measurements: Measurements_Grid;
  viewStart: WeekProps["component"]["startOfView"];
  viewEnd: WeekProps["component"]["endOfView"];
  gridRefs: Refs_Grid;
}

export const SomedayTab: FC<Props> = ({
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
    <SidebarContent ref={somedayRef}>
      {isProcessing && <AbsoluteOverflowLoader />}
      <DragDropContext
        onDragEnd={actions.onDragEnd}
        onDragStart={actions.onDragStart}
      >
        <WeekSection
          dateCalcs={dateCalcs}
          measurements={measurements}
          viewStart={viewStart}
          weekLabel={weekLabel}
          gridRefs={gridRefs}
        />

        <Divider
          color={theme.color.border.primary}
          role="separator"
          title="sidebar divider"
          withAnimation={false}
        />

        <MonthSection
          dateCalcs={dateCalcs}
          measurements={measurements}
          viewStart={viewStart}
          gridRefs={gridRefs}
        />
      </DragDropContext>
    </SidebarContent>
  );
};
