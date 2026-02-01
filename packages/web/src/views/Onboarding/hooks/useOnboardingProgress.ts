import { useEffect, useRef, useState } from "react";
import dayjs from "@core/util/date/dayjs";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";

export function useOnboardingProgress() {
  const dateInView = useDateInView();
  const [hasNavigatedDates, setHasNavigatedDates] = useState(false);
  const previousDateRef = useRef(dayjs().format("YYYY-MM-DD"));
  // Track date navigation
  useEffect(() => {
    const currentDate = dateInView.format("YYYY-MM-DD");
    if (previousDateRef.current !== currentDate) {
      setHasNavigatedDates(true);
      previousDateRef.current = currentDate;
    }
  }, [dateInView]);

  return { hasNavigatedDates };
}
