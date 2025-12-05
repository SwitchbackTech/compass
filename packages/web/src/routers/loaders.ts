import { LoaderFunctionArgs, redirect } from "react-router-dom";
import { zYearMonthDayString } from "@core/types/type.utils";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import { AUTH_FAILURE_REASONS } from "@web/common/constants/auth.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";

export interface DayLoaderData {
  dateInView: Dayjs; // in UTC
  dateString: string;
}

export async function loadAuthenticated() {
  const { session } = await import("../common/classes/Session");

  const authenticated = await session.doesSessionExist();

  return { authenticated };
}

export function loadHasCompletedSignup() {
  const storedValue = localStorage.getItem(STORAGE_KEYS.HAS_COMPLETED_SIGNUP);
  const hasCompletedSignup = storedValue === "true";

  return { hasCompletedSignup };
}

export function loadOnboardingData() {
  const storedValue = localStorage.getItem(STORAGE_KEYS.SKIP_ONBOARDING);
  const skipOnboarding = storedValue === "true";

  return { skipOnboarding };
}

export async function loadLogoutData() {
  const { authenticated } = await loadAuthenticated();

  if (!authenticated) return redirect(ROOT_ROUTES.LOGIN);

  return { authenticated };
}

export async function loadLoginData() {
  const { authenticated } = await loadAuthenticated();
  const { skipOnboarding } = loadOnboardingData();

  if (authenticated) {
    return redirect(skipOnboarding ? ROOT_ROUTES.ROOT : ROOT_ROUTES.ONBOARDING);
  }

  return { authenticated, skipOnboarding };
}

export async function loadLoggedInData() {
  const { authenticated } = await loadAuthenticated();
  const { skipOnboarding } = loadOnboardingData();
  const { hasCompletedSignup } = loadHasCompletedSignup();

  const { USER_SESSION_EXPIRED } = AUTH_FAILURE_REASONS;
  const loginRoute = `${ROOT_ROUTES.LOGIN}?reason=${USER_SESSION_EXPIRED}`;

  if (!authenticated) {
    return redirect(
      skipOnboarding || hasCompletedSignup
        ? loginRoute
        : ROOT_ROUTES.ONBOARDING,
    );
  }

  return { authenticated, skipOnboarding, hasCompletedSignup };
}

export function loadTodayData(): DayLoaderData {
  // Get today's date in local timezone, then convert to UTC while preserving the calendar date
  // This ensures the date is correct regardless of the user's timezone
  const dateInView = dayjs().startOf("day").utc(true);
  const dateFormat = dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT;

  return { dateInView, dateString: dateInView.format(dateFormat) };
}

export async function loadDayData() {
  const { dateString } = loadTodayData();

  return redirect(`${ROOT_ROUTES.DAY}/${dateString}`);
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
