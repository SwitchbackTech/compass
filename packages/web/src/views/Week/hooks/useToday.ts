import dayjs from "@core/util/date/dayjs";

export const useToday = () => {
  const today = dayjs();
  const todayIndex = today.get("day");

  return { today, todayIndex };
};
