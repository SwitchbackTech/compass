import { useMemo } from "react";
import dayjs from "dayjs";

export const useToday = () => {
  const getToday = (todayIndex: number) => {
    const today = dayjs();
    if (today.get("day") === todayIndex) {
      // console.log("day hasn't changed"); //++
      return today;
    }
    // console.log("!! day changed"); //++
    return today;
  };

  const todayIndex = dayjs().get("day");
  const today = useMemo(() => getToday(todayIndex), [todayIndex]);

  return { today, todayIndex };
};
