import { useContext, useMemo } from "react";
import dayjs from "@core/util/date/dayjs";
import { DateNavigationContext } from "@web/views/Day/context/DateNavigationContext";

export function useDateInView(): dayjs.Dayjs {
  const context = useContext(DateNavigationContext);
  const dateInView = context?.dateInView;

  return useMemo(() => dateInView ?? dayjs(), [dateInView]);
}
