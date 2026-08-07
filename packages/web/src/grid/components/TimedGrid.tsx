import {
  type FC,
  type MouseEventHandler,
  type ReactNode,
  type RefCallback,
  useMemo,
} from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import {
  DATA_TIMED_GRID_ROW,
  ID_GRID_COLUMNS_TIMED,
  ID_GRID_MAIN,
  ZIndex,
} from "@web/common/constants/web.constants";
import { useMinuteTick } from "@web/common/hooks/useMinuteTick";
import { type CSSVariables } from "@web/common/styles/css.types";
import { accentGradient } from "@web/common/styles/theme.util";
import {
  getColorsByHour,
  getHourLabels,
} from "@web/common/utils/datetime/web.date.util";
import { getCurrentPercentOfDay } from "@web/common/utils/grid/grid.util";
import {
  EVENT_WIDTH_MINIMUM,
  GRID_MARGIN_LEFT,
  TIMED_VISIBLE_HOURS,
} from "@web/grid/grid.constants";
import { type GridVisibleDate } from "@web/grid/types/grid.types";

interface TimedGridProps {
  columnsId?: string;
  eventsLayer: ReactNode;
  onMouseDown: MouseEventHandler<HTMLElement>;
  today: Dayjs;
  timedColumnsRef: RefCallback<HTMLDivElement>;
  timedGridId?: string;
  timedGridRef: RefCallback<HTMLElement>;
  visibleDates: GridVisibleDate[];
}

export const TimedGrid: FC<TimedGridProps> = ({
  columnsId = ID_GRID_COLUMNS_TIMED,
  eventsLayer,
  onMouseDown,
  timedColumnsRef,
  timedGridId = ID_GRID_MAIN,
  timedGridRef,
  today,
  visibleDates,
}) => {
  const todayColumnIndexes = visibleDates.flatMap(({ date }, index) =>
    date.isSame(today, "day") ? [index] : [],
  );

  return (
    <section
      aria-label="Timed events grid"
      // EventGrid renders the visible focus ring as a sibling overlay so it
      // wraps the all-day row and timed grid together and is not clipped by
      // this section's overflow-y-auto.
      className="peer c-scroll relative min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden [--scrollbar-width:0px] focus-visible:outline-none"
      id={timedGridId}
      ref={timedGridRef}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: WCAG 2.1.1 requires a scrollable region to be keyboard-focusable (axe's scrollable-region-focusable rule); tabIndex={-1} previously made a mouse click the only way in.
      tabIndex={0}
    >
      <CalendarTimeColumn />
      <div
        className="absolute top-0 left-(--calendar-grid-margin-left) grid h-[calc(24*100%/var(--calendar-visible-hours))] w-[calc(100%-var(--calendar-grid-margin-left))] grid-cols-[repeat(var(--calendar-column-count),minmax(var(--calendar-column-min-width),1fr))]"
        id={columnsId}
        ref={timedColumnsRef}
        style={
          {
            "--calendar-column-count": visibleDates.length,
            "--calendar-column-min-width": `${EVENT_WIDTH_MINIMUM}px`,
            "--calendar-grid-margin-left": `${GRID_MARGIN_LEFT}px`,
            "--calendar-visible-hours": TIMED_VISIBLE_HOURS,
          } as CSSVariables
        }
      >
        {todayColumnIndexes.map((columnIndex) => (
          <CalendarNowLine
            columnCount={visibleDates.length}
            columnIndex={columnIndex}
            key={visibleDates[columnIndex]?.key}
          />
        ))}
        <table className="contents">
          <thead className="contents">
            <tr className="contents">
              {visibleDates.map(({ date, key, surfaceLabel }) => (
                <th
                  className="relative box-border block h-full min-w-[var(--calendar-column-min-width)] border-border border-l data-[past=true]:bg-surface"
                  data-past={date.isBefore(today, "day")}
                  aria-label={surfaceLabel ?? date.format("dddd, MMMM D, YYYY")}
                  key={key}
                  scope="col"
                />
              ))}
            </tr>
          </thead>
        </table>
      </div>

      <div
        className="absolute left-12.5 h-full w-[calc(100%-50px)]"
        style={
          {
            "--calendar-visible-hours": TIMED_VISIBLE_HOURS,
          } as CSSVariables
        }
      >
        {getHourLabels(true).map((dayTime) => (
          // biome-ignore lint/a11y/noStaticElementInteractions: Hour rows are pointer-only drag targets for creating timed events.
          <div
            className="relative flex h-[calc(100%/var(--calendar-visible-hours))] w-full items-start border-border border-b"
            key={dayTime}
            {...{ [DATA_TIMED_GRID_ROW]: "true" }}
            onMouseDown={onMouseDown}
          />
        ))}
      </div>

      {eventsLayer}
    </section>
  );
};

const CalendarTimeColumn = () => {
  const currentHour = useMinuteTick().hour();
  const colors = useMemo(() => getColorsByHour(currentHour), [currentHour]);
  const hourLabels = useMemo(() => getHourLabels(), []);

  return (
    <div
      className="absolute top-[calc(100%/var(--calendar-visible-hours)-5px)] z-1 h-full"
      style={
        {
          "--calendar-visible-hours": TIMED_VISIBLE_HOURS,
        } as CSSVariables
      }
    >
      {hourLabels.map((label, index) => (
        <div
          className="h-[calc(100%/var(--calendar-visible-hours))]"
          style={{ color: colors[index] }}
          key={label}
        >
          <span className="block text-[10px]">{label}</span>
        </div>
      ))}
    </div>
  );
};

const CalendarNowLine = ({
  columnCount,
  columnIndex,
}: {
  columnCount: number;
  columnIndex: number;
}) => {
  useMinuteTick();
  const percentOfDay = getCurrentPercentOfDay();

  return (
    <div
      aria-hidden="true"
      className="absolute h-px"
      style={{
        background: accentGradient,
        top: `${percentOfDay}%`,
        left: `calc(${columnIndex} * 100% / ${columnCount})`,
        width: `calc(100% / ${columnCount})`,
        zIndex: ZIndex.LAYER_2,
      }}
    />
  );
};
