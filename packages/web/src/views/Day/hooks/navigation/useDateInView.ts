import { useContext } from "react";
import dayjs from "@core/util/date/dayjs";
import { DateNavigationContext } from "@web/views/Day/context/DateNavigationProvider";

export function useDateInView(): dayjs.Dayjs {
  const context = useContext(DateNavigationContext);

  if (!context) {
    return dayjs();
  }

  return context.dateInView;
}
