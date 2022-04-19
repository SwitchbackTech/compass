import React, { useState } from "react";
import { Dayjs } from "dayjs";
import { HOURS_AM_FORMAT } from "@web/common/constants/dates";
import { Text } from "@web/components/Text";

import { StyledTimes } from "./styled";

interface Props {
  startDate: Dayjs;
  endDate: Dayjs;
}

export const Times: React.FC<Props> = ({ startDate, endDate }) => {
  const [isHovered, setIsHovered] = useState(false);

  const endTimeShortAm = endDate.format(HOURS_AM_FORMAT);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <StyledTimes isHovered={isHovered}>
        <Text lineHeight={11} size={11}>
          {startDate.format(HOURS_AM_FORMAT)}
          {endTimeShortAm && ` - ${endTimeShortAm}`}
        </Text>
      </StyledTimes>
    </div>
  );
};
