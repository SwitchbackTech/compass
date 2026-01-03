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
  const { hasCompletedSignup } = loadHasCompletedSignup();

  if (authenticated) {
    return redirect(skipOnboarding ? ROOT_ROUTES.ROOT : ROOT_ROUTES.ONBOARDING);
  }

  // For new users (no signup completed), redirect to day view immediately
  if (!hasCompletedSignup) {
    const { dateString } = loadTodayData();
    return redirect(`${ROOT_ROUTES.DAY}/${dateString}`);
  }

  return { authenticated, skipOnboarding };
}

export async function loadLoggedInData(args?: LoaderFunctionArgs) {
  const request = args?.request ?? new Request(window.location.href);
  const { authenticated } = await loadAuthenticated();
  const { skipOnboarding } = loadOnboardingData();
  const { hasCompletedSignup } = loadHasCompletedSignup();

  const { USER_SESSION_EXPIRED } = AUTH_FAILURE_REASONS;
  const loginRoute = `${ROOT_ROUTES.LOGIN}?reason=${USER_SESSION_EXPIRED}`;

  // Check if we're accessing the day route
  const url = new URL(request.url);
  const pathname = url.pathname;
  const isDayRoute = pathname.startsWith(ROOT_ROUTES.DAY);

  if (!authenticated) {
    // Allow unauthenticated access to day view for new users
    if (isDayRoute && !hasCompletedSignup) {
      return { authenticated: false, skipOnboarding, hasCompletedSignup };
    }

    return redirect(
      skipOnboarding || hasCompletedSignup
        ? loginRoute
        : ROOT_ROUTES.ONBOARDING,
    );
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

  // Seed initial tasks for this date if none exist (works for both authenticated and unauthenticated users)
  // Skip seeding in test environment to avoid interfering with tests
  if (process.env.NODE_ENV !== "test") {
    const { seedInitialTasks } = await import(
      "@web/common/utils/storage/task-seeding.util"
    );
    seedInitialTasks(dateString);
  }

  return Promise.resolve({
    dateString,
    dateInView: dayjs(dateString, dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT),
  });
}
