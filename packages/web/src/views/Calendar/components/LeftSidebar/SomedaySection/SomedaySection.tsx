import React, { FC, useMemo, useRef } from "react";
import { getAlphaColor } from "@core/util/color.utils";
import { ColorNames } from "@core/types/color.types";
import { selectIsGetSomedayEventsProcessing } from "@web/ducks/events/selectors/someday.selectors";
import { getWeekRangeLabel } from "@web/common/utils/web.date.util";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { Divider } from "@web/components/Divider";
import { useAppSelector } from "@web/store/store.hooks";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { useSidebar } from "@web/views/Calendar/hooks/draft/sidebar/useSidebar";

import { WeekSection } from "./WeekSection/WeekSection";
import { MonthSection } from "./MonthSection";
import { Styled } from "./styled";

interface Props {
  dateCalcs: DateCalcs;
  flex?: number;
  measurements: Measurements_Grid;
  viewStart: WeekProps["component"]["startOfView"];
  viewEnd: WeekProps["component"]["endOfView"];
}

export const SomedaySection: FC<Props> = ({
  dateCalcs,
  flex,
  measurements,
  viewEnd,
  viewStart,
}) => {
  const isProcessing = useAppSelector(selectIsGetSomedayEventsProcessing);

  const sidebarProps = useSidebar(measurements, dateCalcs);

  const somedayRef = useRef();
  const weekLabel = useMemo(
    () => getWeekRangeLabel(viewStart, viewEnd),
    [viewEnd, viewStart]
  );

  return (
    <Styled flex={flex} ref={somedayRef}>
      {isProcessing && <AbsoluteOverflowLoader />}

      <WeekSection
        dateCalcs={dateCalcs}
        measurements={measurements}
        somedayProps={sidebarProps}
        viewStart={viewStart}
        weekLabel={weekLabel}
      />

      <Divider
        color={getAlphaColor(ColorNames.WHITE_4, 0.3)}
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
    </Styled>
  );
};
