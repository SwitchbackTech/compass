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

export async function loadLogoutData() {
  const { authenticated } = await loadAuthenticated();

  return { authenticated };
}

export async function loadOnboardingStatus() {
  const { authenticated } = await loadAuthenticated();
  const {
    isOnboardingSkipped: skipOnboarding,
    isSignupComplete: hasCompletedSignup,
  } = getOnboardingProgress();

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
