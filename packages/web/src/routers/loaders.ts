import { redirect } from "@tanstack/react-router";
import { zYearMonthDayString } from "@core/types/type.utils";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { ROOT_ROUTES } from "@web/common/constants/routes";

export interface DayLoaderData {
  dateInView: Dayjs; // in UTC
  dateString: string;
}

export async function loadAuthenticated() {
  // Playwright e2e serves the web app without a backend; SuperTokens session
  // checks can block navigation until the HTTP client times out. The e2e
  // webpack build uses NODE_ENV=test (see playwright.config.ts webServer env).
  if (process.env.NODE_ENV === "test") {
    return { authenticated: false };
  }

  const { session } = await import("../common/classes/Session");

  const authenticated = await session.doesSessionExist();

  return { authenticated };
}

export function loadTodayData(): DayLoaderData {
  const dateInView = dayjs();
  const dateFormat = dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT;

  return { dateInView, dateString: dateInView.format(dateFormat) };
}

function redirectToToday(
  to: typeof ROOT_ROUTES.DAY_DATE | typeof ROOT_ROUTES.WEEK_DATE,
): never {
  const { dateString } = loadTodayData();

  throw redirect({
    to,
    params: { dateString },
    search: (prev: Record<string, unknown>) => prev,
  });
}

export function loadDayData(): never {
  redirectToToday(ROOT_ROUTES.DAY_DATE);
}

export function loadRootData(): never {
  redirectToToday(ROOT_ROUTES.DAY_DATE);
}

export function loadWeekData(): never {
  redirectToToday(ROOT_ROUTES.WEEK_DATE);
}

function loadSpecificDateData(
  dateString: string | undefined,
  baseRoute: typeof ROOT_ROUTES.DAY | typeof ROOT_ROUTES.WEEK,
): DayLoaderData {
  const parsedDate = zYearMonthDayString.safeParse(dateString);
  const { success, data } = parsedDate;

  if (!success) {
    throw redirect({ to: baseRoute });
  }

  return {
    dateString: data,
    dateInView: dayjs(data, dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT),
  };
}

export function loadSpecificDayData({
  params,
}: {
  params: { dateString: string };
}): DayLoaderData {
  return loadSpecificDateData(params.dateString, ROOT_ROUTES.DAY);
}

export function loadSpecificWeekData({
  params,
}: {
  params: { dateString: string };
}): DayLoaderData {
  return loadSpecificDateData(params.dateString, ROOT_ROUTES.WEEK);
}
