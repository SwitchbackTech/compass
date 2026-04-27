import React, { useEffect, useMemo, useState } from "react";
import dayjs from "@core/util/date/dayjs";
import {
  getColorsByHour,
  getHourLabels,
} from "@web/common/utils/datetime/web.date.util";
import { Text } from "@web/components/Text";
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
          <Text size="xs">{label}</Text>
        </StyledTimesLabel>
      ))}
    </StyledDayTimes>
  );
};
