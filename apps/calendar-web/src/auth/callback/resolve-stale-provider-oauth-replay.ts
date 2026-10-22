import { type ProviderKind } from "@core/types/sync/identity.contracts";
import { isProviderAuthCallbackPath } from "@web/auth/callback/is-provider-auth-callback-path";
import {
  oauthCallbackSearchHasParams,
  oauthCallbackSearchParams,
} from "@web/auth/callback/strip-oauth-callback-url";
import { session } from "@web/auth/compass/session/Session";
import { readProviderAuthorizationIntent } from "@web/auth/providers/authorization/provider-authorization.storage";
import { DEFAULT_CALENDAR_ROUTE } from "@web/common/constants/routes";

export type ResolveStaleProviderOAuthReplayOptions = {
  provider: ProviderKind;
  search: string;
  pathname?: string;
  hasSession?: () => Promise<boolean>;
};

/**
 * A replayed callback after sign-in already finished: intent was consumed on
 * the first pass but the URL still carries `state`/`code`, or the user backed
 * into a stripped callback URL. Send the user to the app without error
 * analytics or a second token exchange.
 */
export async function resolveStaleProviderOAuthReplay({
  provider,
  search,
  pathname,
  hasSession = () => session.doesSessionExist(),
}: ResolveStaleProviderOAuthReplayOptions): Promise<string | null> {
  const onCallbackPath =
    (pathname !== undefined &&
      isProviderAuthCallbackPath(pathname, provider)) ||
    oauthCallbackSearchHasParams(search);

  if (!onCallbackPath) {
    return null;
  }

  if (!(await hasSession())) {
    return null;
  }

  if (!oauthCallbackSearchHasParams(search)) {
    return DEFAULT_CALENDAR_ROUTE;
  }

  const state = oauthCallbackSearchParams(search).get("state");

  if (state) {
    const savedIntent = readProviderAuthorizationIntent(provider, state);
    if (savedIntent) {
      return null;
    }
  }

  return DEFAULT_CALENDAR_ROUTE;
}
