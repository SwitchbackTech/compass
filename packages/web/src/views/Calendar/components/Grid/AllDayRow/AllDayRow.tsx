import React, { FC, MouseEvent, useEffect } from "react";
import dayjs from "dayjs";
import { useDrop } from "react-dnd";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { ColorNames } from "@core/types/color.types";
import { getColor } from "@core/util/color.utils";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { Category_DragItem, DropResult } from "@web/common/types/dnd.types";
import { Ref_Callback } from "@web/common/types/util.types";
import {
  ID_ALLDAY_COLUMNS,
  ID_GRID_ALLDAY_ROW,
  ID_GRID_EVENTS_ALLDAY,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { SIDEBAR_OPEN_WIDTH } from "@web/views/Calendar/layout.constants";
import { getX } from "@web/common/utils/grid.util";
import {
  createEventSlice,
  draftSlice,
  getSomedayEventsSlice,
} from "@web/ducks/events/event.slice";
import {
  selectAllDayEvents,
  selectDraftId,
} from "@web/ducks/events/event.selectors";
import { Flex } from "@web/components/Flex";
import { Text } from "@web/components/Text";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { getPosition } from "@web/views/Calendar/hooks/event/getPosition";
import {
  getDefaultEvent,
  prepEvtAfterDraftDrop,
} from "@web/common/utils/event.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";

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

  const border = `1px solid ${getColor(ColorNames.WHITE_2)}`;

  const allDayEvents = useAppSelector(selectAllDayEvents);
  const _rowVals = allDayEvents.map((e: Schema_GridEvent) => e.row);
  const rowsCount = _rowVals.length === 0 ? 1 : Math.max(..._rowVals);
  const { isDrafting, draftId } = useAppSelector(selectDraftId);

  useEffect(() => {
    measurements.remeasure(ID_GRID_MAIN);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsCount]);

  const convertSomedayDraftToAllDay = (
    dropItem: DropResult,
    dates: { startDate: string; endDate: string }
  ) => {
    const event = prepEvtAfterDraftDrop(
      Categories_Event.ALLDAY,
      dropItem,
      dates
    );

    dispatch(createEventSlice.actions.request(event));
    dispatch(draftSlice.actions.discard());
  };

  const convertSomedayEventToAllDay = (
    _id: string,
    dates: { startDate: string; endDate: string }
  ) => {
    const updatedFields: Schema_Event = {
      isAllDay: true,
      isSomeday: false,
      isTimesShown: false,
      startDate: dates.startDate,
      endDate: dates.endDate,
    };

    dispatch(
      getSomedayEventsSlice.actions.convert({
        _id,
        updatedFields,
      })
    );
  };

  const [{ canDrop, isOver }, drop] = useDrop(
    () => ({
      accept: Category_DragItem.EVENT_SOMEDAY,
      drop: (item: DropResult, monitor) => {
        const { x, y } = monitor.getClientOffset();
        const dates = getDates(x, y);

        if (item._id) {
          convertSomedayEventToAllDay(item._id, dates);
        } else {
          convertSomedayDraftToAllDay(item, dates);
        }
      },
      collect: (monitor) => ({
        canDrop: monitor.canDrop(),
        isOver: monitor.isOver(),
      }),
    }),
    [startOfSelectedWeekDay]
  );

  const editAllDayEvent = (event: Schema_Event) => {
    dispatch(draftSlice.actions.startDragging({ event }));
  };

  const getDates = (x: number, y: number) => {
    const _start = dateCalcs.getDateByXY(
      x - SIDEBAR_OPEN_WIDTH,
      y,
      startOfSelectedWeekDay
    );
    const startDate = _start.format(YEAR_MONTH_DAY_FORMAT);
    const endDate = _start.add(1, "day").format(YEAR_MONTH_DAY_FORMAT);
    return { startDate, endDate };
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
      ref={drop}
      rowsCount={rowsCount}
      onMouseDown={onSectionMouseDown}
    >
      <StyledAllDayColumns id={ID_ALLDAY_COLUMNS} ref={allDayRef}>
        {weekDays.map((day) => (
          <StyledGridCol color={null} key={day.format(YEAR_MONTH_DAY_FORMAT)} />
        ))}
      </StyledAllDayColumns>
      <StyledEvents
        id={ID_GRID_EVENTS_ALLDAY}
        style={{ borderTop: isOver && canDrop ? border : "" }}
      >
        {renderAllDayEvents()}
      </StyledEvents>
    </StyledAllDayRow>
  );
};
