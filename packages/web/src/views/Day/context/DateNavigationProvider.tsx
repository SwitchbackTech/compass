import React, { createContext } from "react";
import { useNavigate } from "react-router-dom";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { useSyncDate } from "../hooks/navigation/useSyncDate";

interface DateNavigationContextValue {
  dateInView: Dayjs;
  navigateToNextDay: () => void;
  navigateToPreviousDay: () => void;
  navigateToToday: () => void;
}

export const DateNavigationContext = createContext<
  DateNavigationContextValue | undefined
>(undefined);

interface DateNavigationProviderProps {
  children: React.ReactNode;
  initialDate: Dayjs;
}

export function DateNavigationProvider({
  children,
  initialDate,
}: DateNavigationProviderProps) {
  const [dateInView, setDateInView] = useSyncDate(initialDate);
  const navigate = useNavigate();

  const navigateToNextDay = () => {
    const nextDate = dateInView.add(1, "day");
    setDateInView(nextDate);
    // Keep URL as /day - date is tracked internally
    navigate(ROOT_ROUTES.DAY, { replace: true });
  };

  const navigateToPreviousDay = () => {
    const prevDate = dateInView.subtract(1, "day");
    setDateInView(prevDate);
    // Keep URL as /day - date is tracked internally
    navigate(ROOT_ROUTES.DAY, { replace: true });
  };

  const navigateToToday = () => {
    // Get today's date at midnight in user's timezone, then convert to UTC
    const today = dayjs().startOf("day").utc();
    setDateInView(today);
    navigate(ROOT_ROUTES.DAY, { replace: true });
  };

  const value: DateNavigationContextValue = {
    dateInView,
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
