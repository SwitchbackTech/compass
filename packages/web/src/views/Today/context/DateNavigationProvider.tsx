import React, { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import { formatDateForUrl } from "../util/date-route.util";

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
  const [dateInView, setDateInView] = useState(initialDate);
  const navigate = useNavigate();

  const navigateToNextDay = () => {
    const nextDate = dateInView.add(1, "day");
    setDateInView(nextDate);
    navigate(`/day/${formatDateForUrl(nextDate)}`);
  };

  const navigateToPreviousDay = () => {
    const prevDate = dateInView.subtract(1, "day");
    setDateInView(prevDate);
    navigate(`/day/${formatDateForUrl(prevDate)}`);
  };

  const navigateToToday = () => {
    const today = dayjs().utc();
    setDateInView(today);
    navigate("/day");
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
