import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import { Text } from "@web/components/Text";
import { getHourLabels, getColorsByHour } from "@web/common/utils/date.utils";

import { StyledDayTimes, StyledTimesLabel } from "./styled";

export const TimesColumn = () => {
  const _initialColors = getColorsByHour(dayjs());
  const [colors, setColors] = useState(_initialColors);

  useEffect(() => {
    const interval = setInterval(() => {
      const colors = getColorsByHour(dayjs());
      setColors(colors);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <StyledDayTimes>
      {getHourLabels().map((label, index) => (
        <StyledTimesLabel color={colors[index]} key={`${label}-${index}`}>
          <Text size={9}>{label}</Text>
        </StyledTimesLabel>
      ))}
    </StyledDayTimes>
  );
};
