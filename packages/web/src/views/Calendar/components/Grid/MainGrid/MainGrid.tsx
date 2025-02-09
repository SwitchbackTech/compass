import React, { FC } from "react";
import mergeRefs from "react-merge-refs";
import { Dayjs } from "dayjs";

import { Ref_Callback } from "@web/common/types/util.types";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { Ref_Grid } from "@web/views/Calendar/components/Grid/grid.types";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";

import { getHourLabels } from "@web/common/utils/web.date.util";

import {
  StyledGridRow,
  StyledGridWithTimeLabels,
  StyledMainGrid,
} from "./styled";
import { MainGridEvents } from "./MainGridEvents";
import { MainGridColumns } from "../Columns/MainGridColumns";

interface Props {
  mainGridRef: Ref_Callback;
  measurements: Measurements_Grid;
  scrollRef: Ref_Grid;
  today: Dayjs;
  weekProps: WeekProps;
}

export const MainGrid: FC<Props> = ({
  mainGridRef,
  measurements,
  today,
  scrollRef,
  weekProps,
}) => {
  const { component } = weekProps;
  const { isCurrentWeek, week, weekDays } = component;

  return (
    <StyledMainGrid id={ID_GRID_MAIN} ref={mergeRefs([mainGridRef, scrollRef])}>
      <MainGridColumns
        isCurrentWeek={isCurrentWeek}
        today={today}
        week={week}
        weekDays={weekDays}
      />

      <StyledGridWithTimeLabels>
        {getHourLabels().map((dayTime, index) => (
          <StyledGridRow
            key={`${dayTime}-${index}:dayTimes`}
            id={`gridRow-${index}`}
          />
        ))}
      </StyledGridWithTimeLabels>

      <MainGridEvents measurements={measurements} weekProps={weekProps} />
    </StyledMainGrid>
  );
};
