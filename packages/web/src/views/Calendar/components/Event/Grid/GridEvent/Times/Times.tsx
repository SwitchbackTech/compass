import React, { useState } from "react";
import debounce from "lodash/debounce";
import { useDispatch } from "react-redux";
import { Text } from "@web/components/Text";
import { editEventSlice } from "@web/ducks/events/event.slice";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { ZIndex } from "@web/common/constants/web.constants";
import { getTimesLabel } from "@web/common/utils/date.utils";

import { StyledTimes, StyledTimesPlaceholder } from "./styled";

interface Props {
  event: Schema_GridEvent;
}
export const Times: React.FC<Props> = ({ event }) => {
  const dispatch = useDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const [isTimesShown, setIsTimesShown] = useState(event.isTimesShown);

  const SIZE = 10;

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
        <StyledTimes isHovered={isHovered} onMouseDown={toggleTimes}>
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
        <StyledTimes isHovered={isHovered}>
          {isHovered && !isTimesShown ? (
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
