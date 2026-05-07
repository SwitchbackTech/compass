import { type FC } from "react";
import { Categories_Event } from "@core/types/event.types";
import { getMonthListLabel } from "@web/common/utils/event/event.util";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import {
  type Measurements_Grid,
  type Refs_Grid,
} from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { SomedayEvents } from "../SomedayEvents/SomedayEvents";

interface Props {
  dateCalcs?: DateCalcs;
  measurements?: Measurements_Grid;
  viewStart: WeekProps["component"]["startOfView"];
  gridRefs?: Refs_Grid;
}

export const SomedayMonthSection: FC<Props> = ({
  dateCalcs,
  measurements,
  viewStart,
  gridRefs,
}) => {
  const monthLabel = getMonthListLabel(viewStart);

  const currentMonth = new Date().toLocaleString("default", { month: "long" });

  const isCurrentMonth = monthLabel === currentMonth;

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium text-sm text-text-lighter">
          {isCurrentMonth ? "This Month" : monthLabel}
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
