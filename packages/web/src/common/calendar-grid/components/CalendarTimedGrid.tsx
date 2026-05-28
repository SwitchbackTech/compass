import {
  type FC,
  type MouseEventHandler,
  type ReactNode,
  type RefCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import styled from "styled-components";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import {
  CALENDAR_EVENT_WIDTH_MINIMUM,
  CALENDAR_GRID_MARGIN_LEFT,
  CALENDAR_TIMED_VISIBLE_HOURS,
} from "@web/common/calendar-grid/calendarGrid.constants";
import { type CalendarGridVisibleDate } from "@web/common/calendar-grid/types/calendarGrid.types";
import {
  DATA_CALENDAR_TIMED_GRID_ROW,
  ID_GRID_COLUMNS_TIMED,
  ID_GRID_MAIN,
  ZIndex,
} from "@web/common/constants/web.constants";
import { blueGradient } from "@web/common/styles/theme.util";
import {
  getColorsByHour,
  getHourLabels,
} from "@web/common/utils/datetime/web.date.util";
import { getCurrentPercentOfDay } from "@web/common/utils/grid/grid.util";
import { Flex } from "@web/components/Flex";
import { Text } from "@web/components/Text";

interface CalendarTimedGridProps {
  columnsId?: string;
  eventsLayer: ReactNode;
  onMouseDown: MouseEventHandler<HTMLElement>;
  today: Dayjs;
  timedColumnsRef: RefCallback<HTMLDivElement>;
  timedGridId?: string;
  timedGridRef: RefCallback<HTMLDivElement>;
  visibleDates: CalendarGridVisibleDate[];
}

const StyledGridRow = styled(Flex)`
  height: calc(100% / ${CALENDAR_TIMED_VISIBLE_HOURS});
  border-bottom: ${({ theme }) => `1px solid ${theme.color.gridLine.primary}`};
  width: 100%;
  position: relative;

  & > span {
    position: absolute;
    bottom: -5px;
    left: -${CALENDAR_GRID_MARGIN_LEFT}px;
  }
`;

const StyledGridWithTimeLabels = styled.div`
  height: 100%;
  left: ${CALENDAR_GRID_MARGIN_LEFT}px;
  position: absolute;
  width: calc(100% - ${CALENDAR_GRID_MARGIN_LEFT}px);
`;

const StyledMainGrid = styled.div`
  --scrollbar-width: 0px;
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  position: relative;
  width: 100%;
`;

const StyledTimedColumns = styled.div<{ $visibleDateCount: number }>`
  display: grid;
  grid-template-columns: ${({ $visibleDateCount }) =>
    `repeat(${$visibleDateCount}, minmax(${CALENDAR_EVENT_WIDTH_MINIMUM}px, 1fr))`};
  height: calc(24 * 100% / ${CALENDAR_TIMED_VISIBLE_HOURS});
  left: ${CALENDAR_GRID_MARGIN_LEFT}px;
  position: absolute;
  top: 0;
  width: calc(100% - ${CALENDAR_GRID_MARGIN_LEFT}px);
`;

const StyledDateColumn = styled.div<{ $isPast: boolean }>`
  background: ${({ $isPast, theme }) =>
    $isPast ? theme.color.bg.secondary : "transparent"};
  border-left: ${({ theme }) => `1px solid ${theme.color.gridLine.primary}`};
  box-sizing: border-box;
  height: 100%;
  min-width: ${CALENDAR_EVENT_WIDTH_MINIMUM}px;
  position: relative;
`;

const StyledTimesLabel = styled.div<{ color: string }>`
  color: ${({ color }) => color};
`;

const StyledDayTimes = styled.div`
  height: 100%;
  position: absolute;
  top: calc(100% / ${CALENDAR_TIMED_VISIBLE_HOURS} + -5px);
  z-index: ${ZIndex.LAYER_1};

  & > div {
    height: calc(100% / ${CALENDAR_TIMED_VISIBLE_HOURS});

    & > span {
      display: block;
    }
  }
`;

const StyledNowLine = styled.div<{ top: number }>`
  background: ${blueGradient};
  height: 1px;
  position: absolute;
  top: ${({ top }) => top}%;
  width: 100%;
  z-index: ${ZIndex.LAYER_2};
`;

export const CalendarTimedGrid: FC<CalendarTimedGridProps> = ({
  columnsId = ID_GRID_COLUMNS_TIMED,
  eventsLayer,
  onMouseDown,
  timedColumnsRef,
  timedGridId = ID_GRID_MAIN,
  timedGridRef,
  today,
  visibleDates,
}) => {
  const isTodayVisible = visibleDates.some(({ date }) =>
    date.isSame(today, "day"),
  );

  return (
    <StyledMainGrid
      aria-label="Timed events grid"
      className="compass-scroll"
      id={timedGridId}
      ref={timedGridRef}
      role="region"
      tabIndex={-1}
    >
      <CalendarTimeColumn />
      <StyledTimedColumns
        $visibleDateCount={visibleDates.length}
        id={columnsId}
        ref={timedColumnsRef}
      >
        {isTodayVisible ? <CalendarNowLine /> : null}
        {visibleDates.map(({ date, key }) => (
          <StyledDateColumn
            $isPast={date.isBefore(today, "day")}
            aria-label={date.format("dddd, MMMM D, YYYY")}
            key={key}
            role="columnheader"
          />
        ))}
      </StyledTimedColumns>

      <StyledGridWithTimeLabels>
        {getHourLabels(true).map((dayTime) => (
          <StyledGridRow
            key={dayTime}
            {...{ [DATA_CALENDAR_TIMED_GRID_ROW]: "true" }}
            onMouseDown={onMouseDown}
          />
        ))}
      </StyledGridWithTimeLabels>

      {eventsLayer}
    </StyledMainGrid>
  );
};

const CalendarTimeColumn = () => {
  const [currentHour, setCurrentHour] = useState(() => dayjs().hour());
  const colors = useMemo(() => getColorsByHour(currentHour), [currentHour]);
  const hourLabels = useMemo(() => getHourLabels(), []);

  useEffect(() => {
    const interval = setInterval(() => {
      const hour = dayjs().hour();

      if (hour !== currentHour) {
        setCurrentHour(hour);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [currentHour]);

  return (
    <StyledDayTimes>
      {hourLabels.map((label, index) => (
        <StyledTimesLabel color={colors[index]} key={label}>
          <Text size="xs">{label}</Text>
        </StyledTimesLabel>
      ))}
    </StyledDayTimes>
  );
};

const CalendarNowLine = () => {
  const [percentOfDay, setPercentOfDay] = useState(() =>
    getCurrentPercentOfDay(),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setPercentOfDay(getCurrentPercentOfDay());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return <StyledNowLine role="separator" title="now line" top={percentOfDay} />;
};
