import { DragDropContext } from "@hello-pangea/dnd";
import { type FC, useRef } from "react";
import { theme } from "@web/common/styles/theme";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { Divider } from "@web/components/Divider";
import { selectIsGetSomedayEventsProcessing } from "@web/ducks/events/selectors/someday.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useSidebarContext } from "@web/views/Week/components/Draft/sidebar/context/useSidebarContext";
import { useWeekLabel } from "@web/views/Week/components/Sidebar/SomedayTab/SomedayWeekSection/useWeekLabel";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import {
  type Measurements_Grid,
  type Refs_Grid,
} from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { SomedayMonthSection } from "./SomedayMonthSection/SomedayMonthSection";
import { SomedayWeekSection } from "./SomedayWeekSection/SomedayWeekSection";
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
        <SomedayWeekSection
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

        <SomedayMonthSection
          dateCalcs={dateCalcs}
          measurements={measurements}
          viewStart={viewStart}
          gridRefs={gridRefs}
        />
      </DragDropContext>
    </SidebarContent>
  );
};
