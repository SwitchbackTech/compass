export const WEEKS_PER_ROW = 52;
export const DEFAULT_DEATH_AGE = 79;
export const DOT_SIZE = 8;
export const DOT_GAP = 2;
export const CONTAINER_PADDING = 48;

export const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

const MS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;

export function getYearOptions(currentYear = new Date().getFullYear()) {
  return Array.from({ length: currentYear - 1900 + 1 }, (_, index) =>
    String(1900 + index),
  );
}

export function getAgeOptions() {
  return Array.from({ length: 150 }, (_, index) => String(index + 1));
}

export function getValidBirthDays(yearValue: string, monthValue: string) {
  const year = Number.parseInt(yearValue, 10);
  const month = Number.parseInt(monthValue, 10);

  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
    return Array.from({ length: 31 }, (_, index) => String(index + 1));
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => String(index + 1));
}

export function getTotalLifeDots(deathAgeValue: string) {
  const years = Number.parseInt(deathAgeValue, 10);

  if (Number.isNaN(years) || years <= 0) {
    return WEEKS_PER_ROW * DEFAULT_DEATH_AGE;
  }

  return WEEKS_PER_ROW * years;
}

export function clampWeeksLived(weeks: number, totalDots: number) {
  return Math.max(0, Math.min(weeks, totalDots));
}

export function getWeekLivedCount(
  birthYear: string,
  birthMonth: string,
  birthDay: string,
  totalDots: number,
  today = new Date(),
) {
  const year = Number.parseInt(birthYear, 10);
  const month = Number.parseInt(birthMonth, 10);
  const day = Number.parseInt(birthDay, 10);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return 0;
  }

  const birthDate = new Date(year, month - 1, day);
  const diffWeeks = Math.floor(
    (today.getTime() - birthDate.getTime()) / MS_PER_WEEK,
  );

  return clampWeeksLived(diffWeeks, totalDots);
}

export function getLifeGridColumns({
  isMobile,
  zoom,
}: {
  isMobile: boolean;
  zoom: number;
}) {
  if (!isMobile) {
    return WEEKS_PER_ROW;
  }

  return Math.max(10, Math.floor(WEEKS_PER_ROW / zoom));
}

export function getLifeDotLabel(weekNumber: number) {
  const yearOfLife = Math.floor((weekNumber - 1) / WEEKS_PER_ROW) + 1;
  const weekOfYear = ((weekNumber - 1) % WEEKS_PER_ROW) + 1;

  return `Year ${yearOfLife}, Week ${weekOfYear}`;
}
