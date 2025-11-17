import { PropsWithChildren, createContext, useCallback } from "react";
import { useNavigate, useRouteLoaderData } from "react-router-dom";
import dayjs from "@core/util/date/dayjs";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { DayLoaderData, loadTodayData } from "@web/routers/loaders";

interface DateNavigationContextProps extends DayLoaderData {
  navigateToNextDay: () => void;
  navigateToPreviousDay: () => void;
  navigateToToday: () => void;
}

export const DateNavigationContext = createContext<DateNavigationContextProps>({
  ...loadTodayData(),
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

  const navigateToNextDay = useCallback(() => {
    const nextDate = dateInView.add(1, "day");

    navigate(`${ROOT_ROUTES.DAY}/${nextDate.format(dateFormat)}`);
  }, [dateInView, navigate]);

  const navigateToPreviousDay = useCallback(() => {
    const prevDate = dateInView.subtract(1, "day");
    navigate(`${ROOT_ROUTES.DAY}/${prevDate.format(dateFormat)}`);
  }, [dateInView, navigate]);

  const navigateToToday = useCallback(() => {
    const { dateString } = loadTodayData();

    navigate(`${ROOT_ROUTES.DAY}/${dateString}`);
  }, [navigate]);

  const value: DateNavigationContextProps = {
    dateInView,
    dateString,
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
