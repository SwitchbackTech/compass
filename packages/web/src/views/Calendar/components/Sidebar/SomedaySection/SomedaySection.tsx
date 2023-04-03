import React, { FC, useRef } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { ColorNames } from "@core/types/color.types";
import { selectIsGetSomedayEventsProcessing } from "@web/ducks/events/selectors/someday.selectors";
import { Text } from "@web/components/Text";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { useAppSelector } from "@web/store/store.hooks";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { useSomedayEvents } from "@web/views/Calendar/hooks/draft/useSidebarDraft";
import {
  SIDEBAR_OPEN_WIDTH,
  GRID_X_START,
} from "@web/views/Calendar/layout.constants";

import { Styled, StyledAddEventButton, StyledHeader } from "./styled";
import { StyledList } from "../EventsList/styled";
import { WeekEventsColumn } from "./WeekColumn/WeekEventsColumn";
import { GridEventPreview } from "../../Event/Grid/GridEventPreview/GridEventPreview";

interface Props {
  dateCalcs: DateCalcs;
  flex?: number;
  measurements: Measurements_Grid;
  viewStart: WeekProps["component"]["startOfView"];
  viewEnd: WeekProps["component"]["endOfView"];
}

export const SomedaySection: FC<Props> = ({
  dateCalcs,
  flex,
  measurements,
  viewEnd,
  viewStart,
}) => {
  const isProcessing = useAppSelector(selectIsGetSomedayEventsProcessing);

  const somedayProps = useSomedayEvents(measurements, dateCalcs, {
    weekStart: viewStart,
    weekEnd: viewEnd,
  });
  const { state, util } = somedayProps;

  const somedayRef = useRef();

  const _isDrafting = state.isDraftingExisting || state.isDraftingNew;
  const shouldPreview = _isDrafting && state.isOverGrid && !state.draft.isOpen;

  const gridX = state.mouseCoords.x - (SIDEBAR_OPEN_WIDTH + GRID_X_START);
  const dayIndex = dateCalcs.getDayNumberByX(gridX);

  return (
    <Styled flex={flex} onClick={util.onSectionClick} ref={somedayRef}>
      {isProcessing && <AbsoluteOverflowLoader />}

      <StyledHeader
        alignItems={AlignItems.CENTER}
        justifyContent={JustifyContent.SPACE_BETWEEN}
      >
        <Text colorName={ColorNames.WHITE_1} role="heading" size={22}>
          {state.weekLabel}
        </Text>

        <div onClick={(e) => e.stopPropagation()}>
          <TooltipWrapper
            description="Add to this week"
            onClick={util.onSectionClick}
            shortcut="S"
          >
            <div role="button">
              <StyledAddEventButton size={25}>+</StyledAddEventButton>
            </div>
          </TooltipWrapper>
        </div>
      </StyledHeader>

      <DragDropContext
        onDragEnd={util.onDragEnd}
        onDragStart={util.onDragStart}
      >
        {shouldPreview && (
          <GridEventPreview
            dateCalcs={dateCalcs}
            dayIndex={dayIndex}
            event={state.draft}
            isOverAllDayRow={state.isOverAllDayRow}
            isOverMainGrid={state.isOverGrid}
            measurements={measurements}
            mouseCoords={state.mouseCoords}
            startOfView={viewStart}
          />
        )}
        <StyledList>
          {state.somedayEvents.columnOrder.map((columnId) => {
            const column = state.somedayEvents.columns[columnId];
            const weekEvents = column.eventIds.map(
              (eventId) => state.somedayEvents.events[eventId]
            );

            return (
              <div key={`${columnId}-wrapper`}>
                <WeekEventsColumn
                  column={column}
                  draft={state.draft}
                  events={weekEvents}
                  isDraftingExisting={state.isDraftingExisting}
                  isDraftingNew={state.isDraftingNew}
                  isOverGrid={state.isOverGrid}
                  key={columnId}
                  util={util}
                />
              </div>
            );
          })}
        </StyledList>
      </DragDropContext>
    </Styled>
  );
};
