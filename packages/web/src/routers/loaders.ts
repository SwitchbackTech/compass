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

function buildTodayRedirectUrl(request: Request, baseRoute: string): string {
  const { dateString } = loadTodayData();
  const url = new URL(request.url);

  return `${baseRoute}/${dateString}${url.search}`;
}

export function loadDayData({
  request,
}: LoaderFunctionArgs<unknown>): Response {
  return redirect(buildTodayRedirectUrl(request, ROOT_ROUTES.DAY));
}

export function loadRootData(args: LoaderFunctionArgs<unknown>): Response {
  return loadDayData(args);
}

export function loadWeekData({
  request,
}: LoaderFunctionArgs<unknown>): Response {
  return redirect(buildTodayRedirectUrl(request, ROOT_ROUTES.WEEK));
}

function loadSpecificDateData(
  params: LoaderFunctionArgs<unknown>["params"],
  baseRoute: string,
): DayLoaderData | Response {
  const parsedDate = zYearMonthDayString.safeParse(params.dateString);
  const { success, data: dateString } = parsedDate;

  if (!success) return redirect(baseRoute);

  return {
    dateString,
    dateInView: dayjs(dateString, dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT),
  };
}

export function loadSpecificDayData({
  params,
}: LoaderFunctionArgs<unknown>): DayLoaderData | Response {
  return loadSpecificDateData(params, ROOT_ROUTES.DAY);
}

export function loadSpecificWeekData({
  params,
}: LoaderFunctionArgs<unknown>): DayLoaderData | Response {
  return loadSpecificDateData(params, ROOT_ROUTES.WEEK);
}
