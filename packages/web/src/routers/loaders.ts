import { redirect } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { AUTH_FAILURE_REASONS } from "../common/constants/auth.constants";

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
