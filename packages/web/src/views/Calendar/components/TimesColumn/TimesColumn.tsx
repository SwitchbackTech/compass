import React from "react";
import { Text } from "@web/components/Text";
import { getHourlyTimes } from "@web/common/utils/date.utils";

import { StyledDayTimes } from "./styled";

export const TimesColumn = () => {
  const dayTimes = getHourlyTimes(); // replace with a constant; no func needed

  return (
    <StyledDayTimes>
      {dayTimes.map((time, index) => (
        <div key={`${time}-${index}`}>
          <Text size={9}>{time}</Text>
        </div>
      ))}
    </StyledDayTimes>
  );
};
