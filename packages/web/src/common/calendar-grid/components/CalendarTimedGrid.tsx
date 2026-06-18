import {
  type FC,
  type MouseEventHandler,
  type ReactNode,
  type RefCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
import { type CSSVariables } from "@web/common/styles/css.types";
import { blueGradient } from "@web/common/styles/theme.util";
import {
  getColorsByHour,
  getHourLabels,
} from "@web/common/utils/datetime/web.date.util";
import { getCurrentPercentOfDay } from "@web/common/utils/grid/grid.util";
import { Flex } from "@web/components/Flex/Flex";
import { Text } from "@web/components/Text/Text";

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
    <div
      aria-label="Timed events grid"
      className="c-calendar-main-grid compass-scroll"
      id={timedGridId}
      ref={timedGridRef}
      role="region"
      tabIndex={-1}
    >
      <CalendarTimeColumn />
      <div
        className="c-calendar-timed-columns"
        id={columnsId}
        ref={timedColumnsRef}
        style={
          {
            "--calendar-column-count": visibleDates.length,
            "--calendar-column-min-width": `${CALENDAR_EVENT_WIDTH_MINIMUM}px`,
            "--calendar-grid-margin-left": `${CALENDAR_GRID_MARGIN_LEFT}px`,
            "--calendar-visible-hours": CALENDAR_TIMED_VISIBLE_HOURS,
          } as CSSVariables
        }
      >
        {isTodayVisible ? <CalendarNowLine /> : null}
        {visibleDates.map(({ date, key }) => (
          <div
            className="c-calendar-date-column data-[past=true]:bg-bg-secondary"
            data-past={date.isBefore(today, "day")}
            aria-label={date.format("dddd, MMMM D, YYYY")}
            key={key}
            role="columnheader"
          />
        ))}
      </div>

      <div className="c-calendar-grid-rows">
        {getHourLabels(true).map((dayTime) => (
          <Flex
            className="c-calendar-grid-row"
            key={dayTime}
            {...{ [DATA_CALENDAR_TIMED_GRID_ROW]: "true" }}
            onMouseDown={onMouseDown}
          />
        ))}
      </div>

      {eventsLayer}
    </div>
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
    <div className="c-calendar-day-times">
      {hourLabels.map((label, index) => (
        <div style={{ color: colors[index] }} key={label}>
          <Text size="xs">{label}</Text>
        </div>
      ))}
    </div>
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

  return (
    <div
      className="c-calendar-now-line"
      role="separator"
      title="now line"
      style={{
        background: blueGradient,
        top: `${percentOfDay}%`,
        zIndex: ZIndex.LAYER_2,
      }}
    />
  );
};
