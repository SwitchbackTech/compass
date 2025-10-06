import { Dayjs } from "dayjs";
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
  today: Dayjs;
}

export const getSomedayWeekLabel = (
  label: string,
  viewStart: Dayjs,
  today: Dayjs,
): string => {
  return isCurrentWeek(label, viewStart, today) ? "This Week" : label;
};

export const isCurrentWeek = (
  label: string,
  viewStart: Dayjs,
  today: Dayjs,
): boolean => {
  const parts = label.split(" - ");
  if (parts.length != 2) return false;

  const [start, end] = label.split(" - ");
  const [startMonth, startDay] = start.split(".").map(Number);
  let [endMonth, endDay] = end.split(".").map(Number);
  const startYear = new Date(Number(viewStart)).getFullYear();
  let endYear = startYear;
  if (startMonth === 12 && endMonth === 1) {
    endYear = startYear + 1;
  }

  if (endDay === undefined) {
    endDay = endMonth;
    endMonth = startMonth;
  }

  const startDate = new Date(startYear, startMonth - 1, startDay);
  const endDate = new Date(endYear, endMonth - 1, endDay);

  today.toDate().setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  console.log(startDate + " " + today + " " + endDate);

  return today.toDate() >= startDate && today.toDate() <= endDate;
};

export const WeekSection: FC<Props> = ({
  dateCalcs,
  measurements,
  viewStart,
  weekLabel,
  gridRefs,
  today,
}) => {
  return (
    <SidebarSection>
      <SidebarHeader
        alignItems={AlignItems.CENTER}
        justifyContent={JustifyContent.SPACE_BETWEEN}
      >
        <Text role="heading" size="xl">
          {getSomedayWeekLabel(weekLabel, viewStart, today)}
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
