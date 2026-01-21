import { LoaderFunctionArgs, redirect } from "react-router-dom";
import { zYearMonthDayString } from "@core/types/type.utils";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { getOnboardingProgress } from "@web/views/Onboarding/utils/onboarding.storage.util";

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
  const { isSignupComplete: hasCompletedSignup } = getOnboardingProgress();

  return { hasCompletedSignup };
}

export function loadOnboardingData() {
  const { isOnboardingSkipped: skipOnboarding } = getOnboardingProgress();

  return { skipOnboarding };
}

export async function loadLogoutData() {
  const { authenticated } = await loadAuthenticated();

  if (!authenticated) return redirect(ROOT_ROUTES.DAY);

  return { authenticated };
}

export async function loadLoggedInData(args?: LoaderFunctionArgs) {
  const request = args?.request ?? new Request(window.location.href);
  const { authenticated } = await loadAuthenticated();
  const { skipOnboarding } = loadOnboardingData();
  const { hasCompletedSignup } = loadHasCompletedSignup();

  // Check if we're accessing routes that work without authentication
  const url = new URL(request.url);
  const pathname = url.pathname;
  const isDayRoute = pathname.startsWith(ROOT_ROUTES.DAY);
  const isRootRoute = pathname === ROOT_ROUTES.ROOT;

  if (!authenticated) {
    // Allow unauthenticated access to root (Week view) and Day routes
    // This enables local-only usage and E2E testing without auth
    if (isDayRoute || isRootRoute) {
      return { authenticated: false, skipOnboarding, hasCompletedSignup };
    }

    return redirect(ROOT_ROUTES.DAY);
  }

  return { authenticated, skipOnboarding, hasCompletedSignup };
}

export function loadTodayData(): DayLoaderData {
  const dateInView = dayjs();
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
