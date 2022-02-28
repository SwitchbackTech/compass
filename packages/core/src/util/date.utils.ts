export const minutesFromNow = (numMin: number, format: string) => {
  if (format === "ms") {
    const MS_IN_MIN = 60000;
    const msToAdd = numMin * MS_IN_MIN;
    const minFromNow = Date.now() + msToAdd;
    return minFromNow;
  } else {
    return -666;
  }
};

export const daysFromNowTimestamp = (numDays: number, format: string) => {
  if (format === "ms") {
    const MS_IN_DAY = 86400000;
    const msToAdd = numDays * MS_IN_DAY;
    const daysFromNow = Date.now() + msToAdd;
    return daysFromNow;
  } else {
    return -666;
  }
};
