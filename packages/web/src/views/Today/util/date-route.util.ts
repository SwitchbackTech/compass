import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";

/**
 * Parse a date string from URL parameter and validate it
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Valid dayjs object or null if invalid
 */
export const parseDateFromUrl = (
  dateString: string | undefined,
): dayjs.Dayjs | null => {
  if (!dateString) {
    return null;
  }

  // Use strict parsing to ensure exact format match
  // Parse in local timezone to maintain user's date context, then convert to UTC for storage/comparison
  const parsed = dayjs(dateString, YEAR_MONTH_DAY_FORMAT, true).utc();

  if (!parsed.isValid()) {
    return null;
  }

  return parsed;
};

/**
 * Correct an invalid date to the nearest valid date in the same month
 * @param dateString - Date string that may be invalid
 * @returns Corrected dayjs object or null if completely invalid
 */
export const correctInvalidDate = (dateString: string): dayjs.Dayjs | null => {
  if (!dateString) {
    return null;
  }

  // Try to parse the date string in local timezone first, then convert to UTC
  const parsed = dayjs(dateString, YEAR_MONTH_DAY_FORMAT, true).utc();

  if (parsed.isValid()) {
    return parsed;
  }

  // If parsing failed, try to extract year, month, day components
  const parts = dateString.split("-");
  if (parts.length !== 3) {
    return null;
  }

  const [yearStr, monthStr, dayStr] = parts;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Validate year
  if (isNaN(year) || year < 1000 || year > 9999) {
    return null;
  }

  // Correct month if invalid
  let correctedMonth = month;
  if (isNaN(month) || month < 1) {
    correctedMonth = 1;
  } else if (month > 12) {
    correctedMonth = 12;
  }

  // Correct day if invalid
  let correctedDay = day;
  if (isNaN(day) || day < 1) {
    correctedDay = 1;
  } else {
    // Get the last day of the corrected month in local timezone, then convert to UTC
    const lastDayOfMonth = dayjs()
      .year(year)
      .month(correctedMonth - 1)
      .endOf("month")
      .utc()
      .date();
    if (day > lastDayOfMonth) {
      correctedDay = lastDayOfMonth;
    }
  }

  // Create corrected date in local timezone first, then convert to UTC
  const corrected = dayjs()
    .year(year)
    .month(correctedMonth - 1)
    .date(correctedDay)
    .utc();

  if (!corrected.isValid()) {
    return null;
  }

  return corrected;
};

/**
 * Get a valid date from URL parameter, correcting invalid dates
 * @param dateString - Date string from URL parameter
 * @returns Valid dayjs object or today's date if invalid
 */
export const getValidDateFromUrl = (
  dateString: string | undefined,
): dayjs.Dayjs => {
  // First try to parse normally
  const parsed = parseDateFromUrl(dateString);
  if (parsed) {
    return parsed;
  }

  // If that failed, try to correct the date
  if (dateString) {
    const corrected = correctInvalidDate(dateString);
    if (corrected) {
      return corrected;
    }
  }

  // Fallback to today's date
  return dayjs().utc();
};

/**
 * Format a dayjs date for URL parameter
 * @param date - dayjs date object
 * @returns Formatted date string for URL
 */
export const formatDateForUrl = (date: dayjs.Dayjs): string => {
  return date.format(YEAR_MONTH_DAY_FORMAT);
};
