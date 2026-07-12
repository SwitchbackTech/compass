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

  const { session } = await import("../auth/compass/session/Session");

  const authenticated = await session.doesSessionExist();

  return { authenticated };
}

export function loadTodayData(): DayLoaderData {
  const dateInView = dayjs();
  const dateFormat = dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT;

  return { dateInView, dateString: dateInView.format(dateFormat) };
}

export function redirectToToday(
  to: typeof ROOT_ROUTES.DAY_DATE | typeof ROOT_ROUTES.WEEK_DATE,
): never {
  const { dateString } = loadTodayData();

  throw redirect({
    to,
    params: { dateString },
    search: (prev: Record<string, unknown>) => prev,
  });
}

export function redirectToCurrentWeek(): never {
  const dateString = dayjs()
    .startOf("week")
    .format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);

  throw redirect({
    to: ROOT_ROUTES.WEEK_DATE,
    params: { dateString },
    search: (prev: Record<string, unknown>) => prev,
  });
}

// Deliberately not params.parse: a throwing parser makes the route not
// match (-> NotFound), but the existing UX redirects an invalid dateString
// to the base route instead. Runs in beforeLoad so an invalid param never
// reaches the loader.
function validateDateStringParam(
  dateString: string | undefined,
  baseRoute: typeof ROOT_ROUTES.DAY | typeof ROOT_ROUTES.WEEK,
): void {
  if (!zYearMonthDayString.safeParse(dateString).success) {
    throw redirect({ to: baseRoute });
  }
}

export function validateDayDateParam({
  params,
}: {
  params: { dateString: string };
}): void {
  validateDateStringParam(params.dateString, ROOT_ROUTES.DAY);
}

export function validateWeekDateParam({
  params,
}: {
  params: { dateString: string };
}): void {
  validateDateStringParam(params.dateString, ROOT_ROUTES.WEEK);
}

// Shared by dayDateRoute and weekDateRoute: once beforeLoad has validated
// the param, shaping it into DayLoaderData doesn't depend on which route
// matched.
export function loadDateParam({
  params,
}: {
  params: { dateString: string };
}): DayLoaderData {
  return {
    dateString: params.dateString,
    dateInView: dayjs(
      params.dateString,
      dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
    ),
  };
}
