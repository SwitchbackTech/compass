import React, { FC, useMemo, useRef } from "react";
import { selectIsGetSomedayEventsProcessing } from "@web/ducks/events/selectors/someday.selectors";
import { getWeekRangeLabel } from "@web/common/utils/web.date.util";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { Divider } from "@web/components/Divider";
import { useAppSelector } from "@web/store/store.hooks";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { theme } from "@web/common/styles/theme";
import { SidebarProps } from "@web/views/Calendar/hooks/draft/sidebar/useSidebar";

import { WeekSection } from "./WeekSection/WeekSection";
import { MonthSection } from "./MonthSection";
import { SidebarContent } from "./styled";

interface Props {
  dateCalcs: DateCalcs;
  measurements: Measurements_Grid;
  sidebarProps: SidebarProps;
  viewStart: WeekProps["component"]["startOfView"];
  viewEnd: WeekProps["component"]["endOfView"];
}

export const SomedayTab: FC<Props> = ({
  dateCalcs,
  measurements,
  sidebarProps,
  viewEnd,
  viewStart,
}) => {
  const isProcessing = useAppSelector(selectIsGetSomedayEventsProcessing);

  const somedayRef = useRef();
  const weekLabel = useMemo(
    () => getWeekRangeLabel(viewStart, viewEnd),
    [viewEnd, viewStart]
  );

  return (
    <SidebarContent ref={somedayRef}>
      {isProcessing && <AbsoluteOverflowLoader />}
      <WeekSection
        dateCalcs={dateCalcs}
        measurements={measurements}
        sidebarProps={sidebarProps}
        viewStart={viewStart}
        weekLabel={weekLabel}
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
        somedayProps={sidebarProps}
        viewStart={viewStart}
      />
    </SidebarContent>
  );
};
