import React, { FC, useRef } from "react";
import { ColorNames } from "@core/types/color.types";
import { Text } from "@web/components/Text";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { DragDropContext } from "@hello-pangea/dnd";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";

import { Styled, StyledAddEventButton, StyledHeader } from "./styled";
import { useSomedayEvents } from "../../../hooks/draft/useSidebarDraft";
import { StyledList } from "../EventsList/styled";
import { WeekEventsColumn } from "./WeekColumn/WeekEventsColumn";

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
  const somedayProps = useSomedayEvents(measurements, {
    weekStart: viewStart,
    weekEnd: viewEnd,
  });
  const { state, util } = somedayProps;

  const somedayRef = useRef();

  return (
    <Styled flex={flex} onClick={util.onSectionClick} ref={somedayRef}>
      {state.isProcessing && <AbsoluteOverflowLoader />}

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
                  dateCalcs={dateCalcs}
                  draftId={state.draft?._id}
                  draggingDraft={state.draggingDraft}
                  events={weekEvents}
                  isDrafting={state.isDraftingSomeday}
                  isOverGrid={state.isOverGrid}
                  key={columnId}
                  measurements={measurements}
                  mouseCoords={somedayProps.state.mouseCoords}
                  util={util}
                  viewStart={viewStart}
                />
              </div>
            );
          })}
        </StyledList>
      </DragDropContext>
    </Styled>
  );
};
