import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Dayjs } from "dayjs";
import { HOURS_AM_FORMAT } from "@web/common/constants/dates";
import { Text } from "@web/components/Text";
import { editEventSlice } from "@web/ducks/events/slice";
import { Schema_GridEvent } from "@web/views/Calendar/weekViewHooks/types";

import { StyledTimes, StyledTimesPlaceholder } from "./styled";

interface Props {
  endDate: Dayjs;
  event: Schema_GridEvent;
  startDate: Dayjs;
}

export const Times: React.FC<Props> = ({ endDate, event, startDate }) => {
  const dispatch = useDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const [isTimesShown, setIsTimesShown] = useState(event.isTimesShown);

  const endTimeShortAm = endDate.format(HOURS_AM_FORMAT);
  const SIZE = 11;

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isTimesShown ? (
        <StyledTimes isHovered={isHovered} onMouseDown={toggleTimes}>
          <Text
            lineHeight={SIZE}
            role="textbox"
            size={SIZE}
            title="Click to hide times"
          >
            {startDate.format(HOURS_AM_FORMAT)}
            {endTimeShortAm && ` - ${endTimeShortAm}`}
          </Text>
        </StyledTimes>
      ) : (
        <StyledTimes isHovered={isHovered}>
          {isHovered ? (
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
