import { ONBOARDING_GUIDE_VIEWS } from "../constants/onboarding.constants";
import { OnboardingGuideView } from "../types/onboarding.guide.types";

export const getGuideViewFromPathname = (
  pathname: string,
): OnboardingGuideView => {
  for (const view of ONBOARDING_GUIDE_VIEWS) {
    if (view.routes.some((route) => route === pathname)) {
      return view.id;
    }
    if (
      view.routePrefixes?.some((prefix) => pathname.startsWith(prefix)) ??
      false
    ) {
      return view.id;
    }
  }
  return "unknown";
};

export const getGuideWelcomeMessage = (viewId: OnboardingGuideView): string => {
  const view = ONBOARDING_GUIDE_VIEWS.find((config) => config.id === viewId);
  if (!view || view.id === "unknown") {
    return "Welcome to Compass";
  }
  return `Welcome to the ${view.label} View`;
};
