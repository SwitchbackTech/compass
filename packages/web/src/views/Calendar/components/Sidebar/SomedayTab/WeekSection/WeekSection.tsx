import dayjs, { Dayjs } from "dayjs";
import React, { FC } from "react";
import { Categories_Event } from "@core/types/event.types";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { Text } from "@web/components/Text";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import {
  Measurements_Grid,
  Refs_Grid,
} from "@web/views/Calendar/hooks/grid/useGridLayout";
import { useToday } from "@web/views/Calendar/hooks/useToday";
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

  const startYear = viewStart.year();
  let endYear = startYear;
  if (startMonth === 12 && endMonth === 1) {
    endYear = startYear + 1;
  }

  if (endDay === undefined) {
    endDay = endMonth;
    endMonth = startMonth;
  }

  const startDate = dayjs(`${startYear}-${startMonth}-${startDay}`).startOf(
    "day",
  );
  const endDate = dayjs(`${endYear}-${endMonth}-${endDay}`).endOf("day");
  const todayDate = today.startOf("day");

  return (
    todayDate.isSame(startDate) ||
    (todayDate.isAfter(startDate) && todayDate.isBefore(endDate)) ||
    todayDate.isSame(endDate)
  );
};

export const WeekSection: FC<Props> = ({
  dateCalcs,
  measurements,
  viewStart,
  weekLabel,
  gridRefs,
}) => {
  const { today } = useToday();

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
