import { type FC, useMemo } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { type Dayjs } from "@core/util/date/dayjs";
import { shouldShowContextualLoadError } from "@web/api/util/api.util";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { isFirstImportInProgress } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";
import { useWeekEventViewModel } from "@web/events/queries/useWeekEventsQuery";
import { selectGridDraft, useDraftStore } from "@web/events/stores/draft.store";
import { EventGrid, isEventGridLoading } from "@web/grid/components/EventGrid";
import { positionAllDayDraftEvent } from "@web/grid/layout/all-day-draft.position";
import { withAllDayColumnTints } from "@web/grid/utils/allDayColumnTint.util";
import { AllDayRow } from "@web/views/Week/components/Grid/AllDayRow/AllDayRow";
import { EdgeNavigationIndicators } from "@web/views/Week/components/Grid/MainGrid/EdgeNavigationIndicators/EdgeNavigationIndicators";
import { MainGrid } from "@web/views/Week/components/Grid/MainGrid/MainGrid";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { useDragEdgeNavigation } from "@web/views/Week/hooks/grid/useDragEdgeNavigation";
import {
  type Measurements_Grid,
  type Refs_Grid,
} from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { GRID_Y_START } from "@web/views/Week/layout.constants";

interface Props {
  dateCalcs: DateCalcs;
  gridRefs: Refs_Grid;
  measurements: Measurements_Grid;
  today: Dayjs;
  weekProps: WeekProps;
}

export const Grid: FC<Props> = ({
  dateCalcs,
  gridRefs,
  measurements,
  today,
  weekProps,
}) => {
  const { allDayRef, allDayRowRef, mainGridElementRef, mainGridRef } = gridRefs;
  // Subscribes to the same cache entry the event layers read, so this reports
  // their load without issuing a second fetch.
  const {
    allDayEvents,
    error: eventsError,
    isPending,
    isFetching,
    isError: isErrorEvents,
    isSuccess,
    data,
    refetch,
  } = useWeekEventViewModel({
    startOfView: weekProps.query.startOfView,
    endOfView: weekProps.query.endOfView,
  });
  const { connection, state: googleState } = useConnectGoogle();
  // Session expiry already surfaces SessionExpiredToast — don't also show
  // "Couldn't load events" / Retry for the same failure.
  const showEventsLoadError = shouldShowContextualLoadError(
    isErrorEvents,
    eventsError,
  );
  const isLoadingEvents = isEventGridLoading(
    isPending,
    showEventsLoadError,
    isFetching,
  );
  const hasVisibleEvents = (data?.ids?.length ?? 0) > 0;
  // googleState alone can't tell a first-ever import apart from an
  // already-established account's routine catch-up - both collapse to the
  // same aggregate IMPORTING state. Without isFirstImportInProgress, an
  // established user viewing a genuinely empty week during ordinary
  // background catch-up would see "Importing from Google…" as if this were
  // a brand-new account.
  const isImportingEmpty =
    isSuccess &&
    !hasVisibleEvents &&
    googleState === "IMPORTING" &&
    isFirstImportInProgress(connection);

  useDragEdgeNavigation(mainGridRef, weekProps);

  const gridDraft = useDraftStore(selectGridDraft);
  // Include the live all-day draft so create/edit chips tint columns before save.
  const allDayEventsForTint = useMemo(
    () =>
      positionAllDayDraftEvent({ draft: gridDraft, events: allDayEvents })
        .events,
    [allDayEvents, gridDraft],
  );

  const weekDays = weekProps.component.weekDays;
  const visibleDates = useMemo(
    () =>
      withAllDayColumnTints(
        weekDays.map((date) => ({
          date,
          key: date.format(YEAR_MONTH_DAY_FORMAT),
        })),
        allDayEventsForTint,
        "date",
      ),
    [allDayEventsForTint, weekDays],
  );

  return (
    <AllDayRow
      allDayRef={allDayRef}
      allDayRowRef={allDayRowRef}
      dateCalcs={dateCalcs}
      measurements={measurements}
      weekProps={weekProps}
    >
      {({ allDayEventsLayer, allDayRowsCount, onAllDayMouseDown }) => (
        <MainGrid
          dateCalcs={dateCalcs}
          mainGridElementRef={mainGridElementRef}
          mainGridRef={mainGridRef}
          measurements={measurements}
          timedColumnsElementRef={gridRefs.timedColumnsElementRef}
          today={today}
          weekProps={weekProps}
        >
          {({ onTimedMouseDown, timedEventsLayer }) => (
            <div
              style={{
                display: "flex",
                flex: 1,
                flexDirection: "column",
                minHeight: 0,
                position: "relative",
                width: "100%",
              }}
            >
              <EventGrid
                allDayEventsLayer={allDayEventsLayer}
                allDayGridOffsetTopPx={GRID_Y_START}
                allDayRowsCount={allDayRowsCount}
                gridRefs={gridRefs}
                isErrorEvents={showEventsLoadError}
                isImportingEmpty={isImportingEmpty}
                isLoadingEvents={isLoadingEvents}
                onAllDayMouseDown={onAllDayMouseDown}
                onRetryEvents={() => void refetch()}
                onTimedMouseDown={onTimedMouseDown}
                timedEventsLayer={timedEventsLayer}
                today={today}
                visibleDates={visibleDates}
              />
              <EdgeNavigationIndicators />
            </div>
          )}
        </MainGrid>
      )}
    </AllDayRow>
  );
};
