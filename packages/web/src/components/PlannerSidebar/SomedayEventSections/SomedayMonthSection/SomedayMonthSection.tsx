import { type FC } from "react";
import { Categories_Event } from "@core/types/event.types";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import {
  type Measurements_Grid,
  type Refs_Grid,
} from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { SomedayEvents } from "../SomedayEvents/SomedayEvents";
import { useMonthLabel } from "./useMonthLabel";

interface Props {
  dateCalcs?: DateCalcs;
  measurements?: Measurements_Grid;
  monthDate: WeekProps["component"]["startOfView"];
  viewStart: WeekProps["component"]["startOfView"];
  gridRefs?: Refs_Grid;
}

export const SomedayMonthSection: FC<Props> = ({
  dateCalcs,
  measurements,
  monthDate,
  viewStart,
  gridRefs,
}) => {
  const monthLabel = useMonthLabel(monthDate);

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-sm text-text-lighter leading-none">
          {monthLabel}
        </h2>
      </div>

      <SomedayEvents
        category={Categories_Event.SOMEDAY_MONTH}
        dateCalcs={dateCalcs}
        measurements={measurements}
        viewStart={viewStart}
        mainGridRef={gridRefs?.mainGridRef}
      />
    </div>
  );
};
