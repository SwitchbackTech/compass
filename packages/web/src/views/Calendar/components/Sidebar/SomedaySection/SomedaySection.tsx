import React, { FC, useRef } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { ColorNames } from "@core/types/color.types";
import { Text } from "@web/components/Text";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { Range_Week } from "@web/common/types/util.types";

import { Styled, StyledAddEventButton, StyledHeader } from "./styled";
import { DraggableSomedayEvent } from "../EventsList/SomedayEvent/DraggableSomedayEvent";
import { StyledList } from "../EventsList/styled";
import { WeekEventsColumn } from "./WeekEventsColumn";
import { useSomedayEvents } from "./hooks/useSomedayEvents";

interface Props {
  flex?: number;
  weekRange: Range_Week;
}

export const SomedaySection: FC<Props> = ({ flex, weekRange }) => {
  const somedayRef = useRef();

  const { state, util } = useSomedayEvents(weekRange);
  const { isProcessing, weekLabel, somedayEvents } = state;

  return (
    //++ <Styled flex={flex} onClick={onSectionClick} ref={somedayRef}>
    <Styled flex={flex} ref={somedayRef}>
      {isProcessing && <AbsoluteOverflowLoader />}

      <StyledHeader
        alignItems={AlignItems.CENTER}
        justifyContent={JustifyContent.SPACE_BETWEEN}
      >
        <Text colorName={ColorNames.WHITE_1} role="heading" size={22}>
          {weekLabel}
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

      <DragDropContext onDragEnd={util.onDragEnd}>
        <StyledList>
          {somedayEvents.columnOrder.map((columnId) => {
            const column = somedayEvents.columns[columnId];
            const weekEvents = column.eventIds.map(
              (eventId) => somedayEvents.events[eventId]
            );

            return (
              <WeekEventsColumn
                column={column}
                events={weekEvents}
                key={columnId}
              />
            );
          })}
          {/* {isNewDraft && (
            <DraggableSomedayEvent
              event={draft}
              id={"somedayDraft"}
              isDrafting={isNewDraft && isDraftingRedux}
              key={"somedayKey"}
              onClose={close}
              onDraft={onDraft}
              onMigrate={onMigrate}
              onSubmit={onSubmit}
              setEvent={setDraft}
            />
          )} */}
        </StyledList>
      </DragDropContext>
    </Styled>
  );
};
