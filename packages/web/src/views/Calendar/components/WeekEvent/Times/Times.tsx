import React, { useState } from "react";
import { Dayjs } from "dayjs";
import { HOURS_AM_FORMAT } from "@web/common/constants/dates";
import { Text } from "@web/components/Text";

import { StyledTimes, StyledTimesPlaceholder } from "./styled";

interface Props {
  endDate: Dayjs;
  isTimesShown: boolean;
  setIsTimesShown: any;
  startDate: Dayjs;
}

export const Times: React.FC<Props> = ({
  endDate,
  isTimesShown,
  setIsTimesShown,
  startDate,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const endTimeShortAm = endDate.format(HOURS_AM_FORMAT);
  const SIZE = 11;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isTimesShown ? (
        <StyledTimes
          isHovered={isHovered}
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsTimesShown(false);
          }}
        >
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
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsTimesShown(true);
              }}
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
