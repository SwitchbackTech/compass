import React, { FC, useMemo, useRef } from "react";
import { theme } from "@web/common/styles/theme";
import { getWeekRangeLabel } from "@web/common/utils/web.date.util";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { Divider } from "@web/components/Divider";
import { selectIsGetSomedayEventsProcessing } from "@web/ducks/events/selectors/someday.selectors";
import { useAppSelector } from "@web/store/store.hooks";
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

  const somedayRef = useRef<HTMLDivElement>(null);
  const weekLabel = useMemo(
    () => getWeekRangeLabel(viewStart, viewEnd),
    [viewEnd, viewStart],
  );

  return (
    <SidebarContent ref={somedayRef}>
      {isProcessing && <AbsoluteOverflowLoader />}
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
    </SidebarContent>
  );
};
