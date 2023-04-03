import React, { FC, MouseEvent, useEffect } from "react";
import dayjs from "dayjs";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { Ref_Callback } from "@web/common/types/util.types";
import {
  ID_ALLDAY_COLUMNS,
  ID_GRID_ALLDAY_ROW,
  ID_GRID_EVENTS_ALLDAY,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { getX } from "@web/common/utils/grid.util";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { selectAllDayEvents } from "@web/ducks/events/selectors/event.selectors";
import { Flex } from "@web/components/Flex";
import { Text } from "@web/components/Text";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { getPosition } from "@web/views/Calendar/hooks/event/getPosition";
import { getDefaultEvent } from "@web/common/utils/event.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { selectDraftId } from "@web/ducks/events/selectors/draft.selectors";

import { StyledEvent } from "../../Event/styled";
import { StyledAllDayColumns, StyledGridCol } from "../Columns/styled";
import { StyledAllDayRow, StyledEvents } from "./styled";

interface Props {
  dateCalcs: DateCalcs;
  allDayRef: Ref_Callback;
  isSidebarOpen: boolean;
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

export const AllDayRow: FC<Props> = ({
  allDayRef,
  dateCalcs,
  isSidebarOpen,
  measurements,
  weekProps,
}) => {
  const dispatch = useAppDispatch();

  const {
    startOfView: startOfSelectedWeekDay,
    endOfView: endOfSelectedWeekDay,
    weekDays,
  } = weekProps.component;

  const allDayEvents = useAppSelector(selectAllDayEvents);
  const _rowVals = allDayEvents.map((e: Schema_GridEvent) => e.row);
  const rowsCount = _rowVals.length === 0 ? 1 : Math.max(..._rowVals);
  const { isDrafting, draftId } = useAppSelector(selectDraftId);

  useEffect(() => {
    measurements.remeasure(ID_GRID_MAIN);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsCount]);

  const editAllDayEvent = (event: Schema_Event) => {
    dispatch(draftSlice.actions.startDragging({ event }));
  };

  const startAlldayDraft = (e: MouseEvent) => {
    const x = getX(e, isSidebarOpen);
    const startDate = dateCalcs.getDateStrByXY(
      x,
      e.clientY,
      startOfSelectedWeekDay,
      YEAR_MONTH_DAY_FORMAT
    );

    const event = getDefaultEvent(Categories_Event.ALLDAY, startDate);
    dispatch(
      draftSlice.actions.start({
        eventType: Categories_Event.ALLDAY,
        event,
      })
    );
  };

  const onEventMouseDown = (e: MouseEvent, event: Schema_Event) => {
    e.stopPropagation();

    if (isDrafting) {
      dispatch(
        draftSlice.actions.swap({ event, category: Categories_Event.ALLDAY })
      );
      return;
    }

    editAllDayEvent(event);
  };

  const onSectionMouseDown = (e: MouseEvent) => {
    if (isDrafting) {
      dispatch(draftSlice.actions.discard());
      return;
    }

    startAlldayDraft(e);
  };

  const renderAllDayEvents = () => {
    const _allDayEvents = allDayEvents.map((event: Schema_Event, i: number) => {
      const position = getPosition(
        event,
        startOfSelectedWeekDay,
        endOfSelectedWeekDay,
        measurements,
        false
      );

      return (
        <StyledEvent
          allDay={event.isAllDay}
          height={position.height}
          isDragging={false}
          isInPast={dayjs().isAfter(dayjs(event.endDate))}
          isPlaceholder={isDrafting && event._id === draftId}
          isResizing={false}
          key={`${event.title}-${i}`}
          left={position.left}
          onMouseDown={(e) => onEventMouseDown(e, event)}
          priority={event.priority}
          role="button"
          top={position.top}
          width={position.width}
        >
          <Flex
            alignItems={AlignItems.FLEX_START}
            direction={FlexDirections.COLUMN}
          >
            <Text size={10.3} role="textbox">
              {event.title}
              <SpaceCharacter />
            </Text>
          </Flex>
        </StyledEvent>
      );
    });

    return _allDayEvents;
  };

  return (
    <StyledAllDayRow
      id={ID_GRID_ALLDAY_ROW}
      rowsCount={rowsCount}
      onMouseDown={onSectionMouseDown}
    >
      <StyledAllDayColumns id={ID_ALLDAY_COLUMNS} ref={allDayRef}>
        {weekDays.map((day) => (
          <StyledGridCol color={null} key={day.format(YEAR_MONTH_DAY_FORMAT)} />
        ))}
      </StyledAllDayColumns>
      <StyledEvents id={ID_GRID_EVENTS_ALLDAY}>
        {renderAllDayEvents()}
      </StyledEvents>
    </StyledAllDayRow>
  );
};
