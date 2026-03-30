import { type CodeResponse } from "@react-oauth/google";

export interface GoogleAuthConfig {
  thirdPartyId: string;
  clientType: "web";
  shouldTryLinkingWithSessionUser?: boolean;
  redirectURIInfo: {
    redirectURIOnProviderDashboard: string;
    redirectURIQueryParams: Omit<
      CodeResponse,
      "error" | "error_description" | "error_uri"
    >;
    pkceCodeVerifier?: string;
  };
}
