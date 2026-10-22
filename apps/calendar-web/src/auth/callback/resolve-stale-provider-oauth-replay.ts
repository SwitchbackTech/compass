import { type ProviderKind } from "@core/types/sync/identity.contracts";
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
  hasSession?: () => Promise<boolean>;
};

/**
 * A replayed callback after sign-in already finished: intent was consumed on
 * the first pass but the URL still carries `state`/`code`. Send the user to the
 * app without error analytics or a second token exchange.
 */
export async function resolveStaleProviderOAuthReplay({
  provider,
  search,
  hasSession = () => session.doesSessionExist(),
}: ResolveStaleProviderOAuthReplayOptions): Promise<string | null> {
  if (!oauthCallbackSearchHasParams(search)) {
    return null;
  }

  if (!(await hasSession())) {
    return null;
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
