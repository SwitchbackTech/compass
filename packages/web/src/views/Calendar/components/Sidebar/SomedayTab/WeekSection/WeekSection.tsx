import dayjs from "dayjs";
import React, { FC } from "react";
import { Categories_Event } from "@core/types/event.types";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { Text } from "@web/components/Text";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import {
  Measurements_Grid,
  Refs_Grid,
} from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { SomedayEvents } from "../SomedayEvents/SomedayEvents";
import { SidebarHeader, SidebarSection } from "../styled";

interface Props {
  dateCalcs: DateCalcs;
  measurements: Measurements_Grid;
  viewStart: WeekProps["component"]["startOfView"];
  weekLabel: string;
  gridRefs: Refs_Grid;
}

export const isCurrentWeek = (
  label: string,
  viewStart: dayjs.Dayjs,
  today: Date = new Date(),
): boolean => {
  const [start, end] = label.split(" - ");
  const [startMonth, startDay] = start.split(".").map(Number);
  let [endMonth, endDay] = end.split(".").map(Number);
  let year = new Date(Number(viewStart)).getFullYear();

  if (endDay === undefined) {
    endDay = endMonth;
    endMonth = startMonth;
  }

  const startDate = new Date(year, startMonth - 1, startDay);
  if (startMonth === 12 && endMonth === 1) year++;
  const endDate = new Date(year, endMonth - 1, endDay);

  today.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  return today >= startDate && today <= endDate;
};

export const WeekSection: FC<Props> = ({
  dateCalcs,
  measurements,
  viewStart,
  weekLabel,
  gridRefs,
}) => {
  return (
    <SidebarSection>
      <SidebarHeader
        alignItems={AlignItems.CENTER}
        justifyContent={JustifyContent.SPACE_BETWEEN}
      >
        <Text role="heading" size="xl">
          {isCurrentWeek(weekLabel, viewStart) ? "This Week" : weekLabel}
        </Text>
      </SidebarHeader>

      <SomedayEvents
        category={Categories_Event.SOMEDAY_WEEK}
        dateCalcs={dateCalcs}
        measurements={measurements}
        viewStart={viewStart}
        mainGridRef={gridRefs.mainGridRef}
      />
    </SidebarSection>
  );
};
