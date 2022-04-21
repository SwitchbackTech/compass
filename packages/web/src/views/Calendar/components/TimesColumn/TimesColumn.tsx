import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import { Text } from "@web/components/Text";
import { getHourlyTimesDynamic } from "@web/common/utils/date.utils";

import { StyledDayTimes, StyledTimesLabel } from "./styled";

export const TimesColumn = () => {
  const { timeLabels, colors } = getHourlyTimesDynamic(dayjs());
  const [colorsVals, setColorVals] = useState(colors);

  useEffect(() => {
    const interval = setInterval(() => {
      const { colors } = getHourlyTimesDynamic(dayjs());
      setColorVals(colors);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <StyledDayTimes>
      {timeLabels.map((label, index) => (
        <StyledTimesLabel color={colorsVals[index]} key={`${label}-${index}`}>
          <Text size={9}>{label}</Text>
        </StyledTimesLabel>
      ))}
    </StyledDayTimes>
  );
};
