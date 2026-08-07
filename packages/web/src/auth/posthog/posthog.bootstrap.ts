import { type PostHog } from "posthog-js";
import { isPosthogEnabled } from "@web/auth/posthog/posthog.util";
import { filterPosthogBeforeSend } from "@web/auth/posthog/posthog-exception-filter.util";
import { ENV_WEB } from "@web/common/constants/env.constants";

let client: PostHog | undefined;

/**
 * Initialize PostHog once, outside the React tree.
 *
 * `index.tsx` calls this before `root.render`, so PostHog's
 * `capture_unhandled_errors`/`capture_unhandled_rejections` handlers are
 * installed before IndexedDB and `sessionInit()` are awaited. A throw during
 * boot - the exact shape that left session 019fb57e blank with zero telemetry -
 * is then captured instead of vanishing. The React provider reads this client
 * after boot rather than owning a second initialization path.
 */
export function initPosthog(): PostHog | undefined {
  if (!isPosthogEnabled()) return undefined;
  if (client) return client;

  const posthog = require("posthog-js").posthog as PostHog;
  posthog.init(ENV_WEB.POSTHOG_KEY as string, {
    api_host: ENV_WEB.POSTHOG_HOST!,
    // Assumes the US cloud; self-hosters on another instance would differ.
    ui_host: "https://us.posthog.com",
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      // Off on purpose: the app deliberately console.error's errors it
      // has already handled (a network blip during a session check, a
      // retryable 502 from a provider), so capturing console.error as an
      // exception turns every expected transient failure into a fresh
      // error-tracking issue. Genuinely uncaught errors/rejections are
      // still captured by the two handlers above.
      capture_console_errors: false,
    },
    // Drop known-unactionable exception signatures (SuperTokens/browser
    // network blips, CefSharp scanner noise, opaque "Script error.") before
    // they become issues.
    before_send: filterPosthogBeforeSend,
    opt_in_site_apps: true,
    person_profiles: "always",
  });
  // Staging and production share this PostHog project with the same key, so
  // without this, staging traffic is indistinguishable from production in
  // every insight (env.constants.ts NODE_ENV mirrors sync/backend's
  // `environment` property for the same reason).
  posthog.register({ environment: ENV_WEB.NODE_ENV });

  client = posthog;
  return client;
}

/**
 * The initialized PostHog instance, or undefined when PostHog is disabled or
 * has not been initialized yet. Non-React callers (e.g. the error boundary)
 * use this to report without a hook.
 */
export function getPosthogClient(): PostHog | undefined {
  return client;
}
