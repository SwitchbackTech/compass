import React from "react";
import dayjs from "dayjs";
import { Flex } from "@web/components/Flex";
import { Text } from "@web/components/Text";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { GridPosition } from "@web/views/Calendar/components/Grid/grid.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { HOURS_AM_FORMAT } from "@web/common/constants/dates";
import { Hook_Draft } from "@web/views/Calendar/hooks/draft/useDraft";

import { StyledEvent, StyledEventScaler } from "../../styled";

interface Props {
  draft: Schema_GridEvent;
  isDragging: boolean;
  isResizing: boolean;
  onEventMouseDown: Hook_Draft["draftHelpers"]["startDragging"];
  onMouseMove: Hook_Draft["draftHelpers"]["resize"];
  onMouseUp: Hook_Draft["draftHelpers"]["stopResizing"];
  onResize: Hook_Draft["draftHelpers"]["resize"];
  onScalerMouseDown: Hook_Draft["draftHelpers"]["startResizing"];
  position: GridPosition;
}

const _GridEvent = (
  {
    draft,
    isDragging,
    isResizing,
    position,
    onEventMouseDown,
    onMouseUp,
    onMouseMove: _onMouseMove,
    onScalerMouseDown,
  }: Props,
  ref: React.ForwardedRef<HTMLButtonElement>
) => {
  const startLabel = dayjs(draft.startDate).format(HOURS_AM_FORMAT);
  const endLabel = dayjs(draft.endDate).format(HOURS_AM_FORMAT);
  const times = `${startLabel} - ${endLabel}`;

  return (
    <StyledEvent
      allDay={draft.isAllDay || false}
      className={"active"}
      // duration={+durationHours || 1} //++
      height={position.height}
      isDragging={isDragging}
      isPlaceholder={false}
      isResizing={isResizing}
      left={position.left}
      // lineClamp={event.isAllDay ? 1 : getLineClamp(durationHours)}
      // lineClamp={1}
      onMouseDown={(e) => onEventMouseDown(e, draft)}
      onMouseMove={(e) => _onMouseMove(e)}
      onMouseUp={onMouseUp}
      priority={draft.priority}
      ref={ref}
      role="button"
      tabindex="0"
      top={position.top}
      width={position.width}
    >
      <Flex
        alignItems={AlignItems.FLEX_START}
        direction={FlexDirections.COLUMN}
      >
        {!draft.isAllDay && (
          <>
            <Text
              lineHeight={10}
              role="textbox"
              size={10}
              title="Click to hide times"
            >
              {times}
            </Text>
            <StyledEventScaler
              top="-1px"
              onMouseDown={(e) => onScalerMouseDown(e, "startDate")}
            />

            <StyledEventScaler
              bottom="-1px"
              onMouseDown={(e) => onScalerMouseDown(e, "endDate")}
            />
          </>
        )}

        <Text size={12} role="textbox">
          {draft.title}
          <SpaceCharacter />
        </Text>
      </Flex>
    </StyledEvent>
  );
};

export const GridEvent = React.forwardRef(_GridEvent);
