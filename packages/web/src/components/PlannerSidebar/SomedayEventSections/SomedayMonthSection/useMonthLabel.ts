import { useMemo } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { getMonthListLabel } from "@web/common/utils/event/event.util";
import { useToday } from "@web/views/Week/hooks/useToday";

export const useMonthLabel = (viewStart: Dayjs) => {
  const { today } = useToday();

  return useMemo(() => {
    const label = getMonthListLabel(viewStart);
    return getSomedayMonthLabel(label, viewStart, today);
  }, [viewStart, today]);
};

export const getSomedayMonthLabel = (
  label: string,
  viewStart: Dayjs,
  today: Dayjs,
): string => {
  return viewStart.isSame(today, "month") ? "This Month" : label;
};
