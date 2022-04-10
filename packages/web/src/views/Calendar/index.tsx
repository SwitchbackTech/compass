import React from "react";

import { CalendarView } from "./Calendar";
import { useGetWeekViewProps } from "./weekViewHooks/useGetWeekViewProps";

export const CalendarViewMemoWrapper = () => {
  const weekViewProps = useGetWeekViewProps();

  return <CalendarView weekViewProps={weekViewProps} />;
};

export { CalendarViewMemoWrapper as CalendarView };
