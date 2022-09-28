import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { Text } from "@web/components/Text";
import {
  getHourLabels,
  getColorsByHour,
} from "@web/common/utils/web.date.util";

import { StyledDayTimes, StyledTimesLabel } from "./styled";

export const TimesColumn = () => {
  const [currentHour, setCurrentHour] = useState(dayjs().hour());
  const [colors, setColors] = useState<string[] | null>(null);
  const hourLabels = useMemo(() => getHourLabels(), []);

  useEffect(() => {
    const _colors = getColorsByHour(currentHour);
    setColors(_colors);
  }, [currentHour]);

  useEffect(() => {
    const interval = setInterval(() => {
      const hour = dayjs().hour();
      if (hour !== currentHour) {
        setCurrentHour(hour);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [currentHour]);

  if (!colors) return null;

  return (
    <StyledDayTimes>
      {hourLabels.map((label, index) => (
        <StyledTimesLabel color={colors[index]} key={`${label}-${index}`}>
          <Text size={9}>{label}</Text>
        </StyledTimesLabel>
      ))}
    </StyledDayTimes>
  );
};
