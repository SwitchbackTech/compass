import { type ProviderAuthAdapter } from "@sync/providers/provider-auth.port";

// Which auth flows a provider implements. Password-only providers (Apple) set
// oauthRedirect false; OAuth redirect providers (Google, Microsoft) set it true.
export interface AuthContractCapabilities {
  readonly oauthRedirect: boolean;
}

export interface AuthContractCase {
  readonly name: string;
  readonly requires: keyof AuthContractCapabilities;
  readonly run: (adapter: ProviderAuthAdapter) => Promise<void>;
}

// Shared OAuth redirect cases from P0 WP-11 (#3236). Providers that lack a
// capability mark matching cases not-applicable instead of skipping them.
export const OAUTH_AUTH_CONTRACT_CASES: AuthContractCase[] = [
  {
    name: "exchange yields identity and refresh token",
    requires: "oauthRedirect",
    run: async () => {
      throw new Error("OAuth auth contract corpus not wired for this provider");
    },
  },
  {
    name: "refresh mints a short-lived access token",
    requires: "oauthRedirect",
    run: async () => {
      throw new Error("OAuth auth contract corpus not wired for this provider");
    },
  },
  {
    name: "revoked refresh maps to authorizationRevoked",
    requires: "oauthRedirect",
    run: async () => {
      throw new Error("OAuth auth contract corpus not wired for this provider");
    },
  },
];
