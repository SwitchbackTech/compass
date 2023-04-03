import React, { useState } from "react";
import debounce from "lodash/debounce";
import { useAppDispatch } from "@web/store/store.hooks";
import { Text } from "@web/components/Text";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { ZIndex } from "@web/common/constants/web.constants";
import { getTimesLabel } from "@web/common/utils/web.date.util";
import { editEventSlice } from "@web/ducks/events/slices/event.slice";

import { StyledTimes, StyledTimesPlaceholder } from "./styled";

interface Props {
  event: Schema_GridEvent;
  isDrafting: boolean;
  isPlaceholder: boolean;
}
export const Times: React.FC<Props> = ({
  event,
  isDrafting,
  isPlaceholder,
}) => {
  const dispatch = useAppDispatch();

  const [isHovered, setIsHovered] = useState(false);
  const [isTimesShown, setIsTimesShown] = useState(event.isTimesShown);

  const SIZE = 10;
  const shouldRevealBox = isPlaceholder && !isTimesShown && !isDrafting;

  const toggleTimes = (e: React.MouseEvent) => {
    e.stopPropagation();

    const newVal = !isTimesShown;
    setIsTimesShown(() => newVal);

    dispatch(
      editEventSlice.actions.request({
        _id: event._id,
        event: { ...event, isTimesShown: newVal },
      })
    );
  };

  return (
    <div
      onMouseEnter={debounce(() => setIsHovered(true), 300)}
      onMouseLeave={debounce(() => setIsHovered(false), 300)}
    >
      {isTimesShown ? (
        <StyledTimes
          revealBox={isHovered && !isDrafting}
          onMouseDown={toggleTimes}
        >
          <Text
            lineHeight={SIZE}
            role="textbox"
            size={SIZE}
            title="Click to hide times"
            zIndex={ZIndex.LAYER_3}
          >
            {getTimesLabel(event.startDate, event.endDate)}
          </Text>
        </StyledTimes>
      ) : (
        <StyledTimes revealBox={shouldRevealBox}>
          {isHovered && shouldRevealBox ? (
            <Text
              lineHeight={SIZE}
              onMouseDown={toggleTimes}
              size={SIZE}
              role="textbox"
              title="Click to show times"
            >
              Show times
            </Text>
          ) : (
            <StyledTimesPlaceholder />
          )}
        </StyledTimes>
      )}
    </div>
  );
};
