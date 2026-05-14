import { useEffect, useMemo, useState } from "react";
import dayjs from "@core/util/date/dayjs";
import {
  getColorsByHour,
  getHourLabels,
} from "@web/common/utils/datetime/web.date.util";
import { Text } from "@web/components/Text";
import { StyledDayTimes, StyledTimesLabel } from "./styled";

export const TimesColumn = () => {
  const [currentHour, setCurrentHour] = useState(() => dayjs().hour());
  const hourLabels = useMemo(() => getHourLabels(), []);
  const colors = useMemo(() => getColorsByHour(currentHour), [currentHour]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour((current) => {
        const hour = dayjs().hour();
        if (window.__weekInteractionV2MotionActive || hour === current) {
          return current;
        }

        return hour;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <StyledDayTimes>
      {hourLabels.map((label, index) => (
        <StyledTimesLabel
          color={colors[index]}
          key={`${label}-${colors[index]}`}
        >
          <Text size="xs">{label}</Text>
        </StyledTimesLabel>
      ))}
    </StyledDayTimes>
  );
};
