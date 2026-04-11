import { type LoaderFunctionArgs, redirect } from "react-router-dom";
import { zYearMonthDayString } from "@core/types/type.utils";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { ROOT_ROUTES } from "@web/common/constants/routes";

export interface DayLoaderData {
  dateInView: Dayjs; // in UTC
  dateString: string;
}

export async function loadAuthenticated() {
  // Playwright e2e serves the web app without a backend; SuperTokens session
  // checks can block navigation until the HTTP client times out.
  if (process.env.NODE_ENV === "test") {
    return { authenticated: false };
  }

  const { session } = await import("../common/classes/Session");

  const authenticated = await session.doesSessionExist();

  return { authenticated };
}

export async function loadLogoutData() {
  const { authenticated } = await loadAuthenticated();

  return { authenticated };
}

export function loadTodayData(): DayLoaderData {
  const dateInView = dayjs();
  const dateFormat = dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT;

  return { dateInView, dateString: dateInView.format(dateFormat) };
}

function buildTodayRedirectUrl(request: Request): string {
  const { dateString } = loadTodayData();
  const url = new URL(request.url);

  return `${ROOT_ROUTES.DAY}/${dateString}${url.search}`;
}

export function loadDayData({
  request,
}: LoaderFunctionArgs<unknown>): Response {
  return redirect(buildTodayRedirectUrl(request));
}

export function loadRootData(args: LoaderFunctionArgs<unknown>): Response {
  return loadDayData(args);
}

export async function loadSpecificDayData({
  params,
}: LoaderFunctionArgs<unknown>): Promise<DayLoaderData | Response> {
  const parsedDate = zYearMonthDayString.safeParse(params.dateString);
  const { success, data: dateString } = parsedDate;

  if (!success) return redirect(ROOT_ROUTES.DAY);

  return Promise.resolve({
    dateString,
    dateInView: dayjs(dateString, dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT),
  });
}
