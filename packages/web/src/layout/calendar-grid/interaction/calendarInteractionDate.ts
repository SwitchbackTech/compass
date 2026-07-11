import dayjs from "@core/util/date/dayjs";

export const getLocalMinutes = (date: string | undefined) => {
  const parsed = dayjs(date);

  return parsed.hour() * 60 + parsed.minute();
};
