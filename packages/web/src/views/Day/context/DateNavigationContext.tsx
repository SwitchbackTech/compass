import { createContext, type PropsWithChildren, useCallback } from "react";
import { useNavigate, useRouteLoaderData } from "react-router-dom";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { type DayLoaderData, loadTodayData } from "@web/routers/loaders";

interface DateNavigationContextProps extends DayLoaderData {
  navigateToDate: (date: Dayjs) => void;
  navigateToNextDay: () => void;
  navigateToPreviousDay: () => void;
  navigateToToday: () => void;
}

export const DateNavigationContext = createContext<DateNavigationContextProps>({
  ...loadTodayData(),
  navigateToDate: () => {},
  navigateToNextDay: () => {},
  navigateToPreviousDay: () => {},
  navigateToToday: () => {},
});

const dateFormat = dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT;

export function DateNavigationProvider({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const routeData = useRouteLoaderData(ROOT_ROUTES.DAY_DATE) as
    | DayLoaderData
    | undefined;

  const { dateInView, dateString } = routeData ?? loadTodayData();

  const navigateToDate = useCallback(
    (date: dayjs.Dayjs) => {
      navigate(`${ROOT_ROUTES.DAY}/${date.format(dateFormat)}`);
    },
    [navigate],
  );

  const navigateToNextDay = useCallback(() => {
    const nextDate = dateInView.add(1, "day");

    navigateToDate(nextDate);
  }, [dateInView, navigateToDate]);

  const navigateToPreviousDay = useCallback(() => {
    const prevDate = dateInView.subtract(1, "day");
    navigateToDate(prevDate);
  }, [dateInView, navigateToDate]);

  const navigateToToday = useCallback(() => {
    const { dateString } = loadTodayData();

    navigate(`${ROOT_ROUTES.DAY}/${dateString}`);
  }, [navigate]);

  const value: DateNavigationContextProps = {
    dateInView,
    dateString,
    navigateToDate,
    navigateToNextDay,
    navigateToPreviousDay,
    navigateToToday,
  };

  return (
    <DateNavigationContext.Provider value={value}>
      {children}
    </DateNavigationContext.Provider>
  );
}
