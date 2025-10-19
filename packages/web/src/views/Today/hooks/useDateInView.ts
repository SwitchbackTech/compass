import { useContext } from "react";
import dayjs from "@core/util/date/dayjs";
import { DateNavigationContext } from "../context/DateNavigationProvider";

export function useDateInView(): dayjs.Dayjs {
  const context = useContext(DateNavigationContext);
  if (!context) {
    // Fallback to today's date for testing or when not in DateNavigationProvider
    return dayjs();
  }
  return context.dateInView;
}
