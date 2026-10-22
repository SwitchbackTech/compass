import { type NavigateOptions } from "@tanstack/react-router";
import { isProviderAuthCallbackPath } from "@web/auth/callback/is-provider-auth-callback-path";
import { trackTrialStepAbandoned } from "@web/auth/posthog/signup-funnel";
import { readSignupTrialMethod } from "@web/billing/signup-trial.util";
import { DEFAULT_CALENDAR_ROUTE } from "@web/common/constants/routes";

export type DismissSignupTrialStepOptions = {
  trackAbandon?: boolean;
  analytics?: { method?: ReturnType<typeof readSignupTrialMethod> };
};

/**
 * Closes the post-signup trial step without leaving an OAuth callback in the
 * history stack. Callers pass TanStack `navigate` with `to: "."` and replace.
 */
export function dismissSignupTrialStep(
  navigate: (options: NavigateOptions) => void,
  { trackAbandon = true, analytics }: DismissSignupTrialStepOptions = {},
): void {
  const method = analytics?.method ?? readSignupTrialMethod();
  if (trackAbandon) {
    trackTrialStepAbandoned({
      source: "signup_trial_step",
      method,
      ...analytics,
    });
  }

  const onCallbackPath =
    typeof window !== "undefined" &&
    isProviderAuthCallbackPath(window.location.pathname);

  navigate({
    to: onCallbackPath ? DEFAULT_CALENDAR_ROUTE : ".",
    replace: true,
    search: (prev) => ({
      ...prev,
      auth: undefined,
    }),
  });
}
