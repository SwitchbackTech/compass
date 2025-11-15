import { CodeResponse } from "@react-oauth/google";

export interface SignInUpInput {
  thirdPartyId: string;
  clientType: "web";
  redirectURIInfo: {
    redirectURIOnProviderDashboard: string;
    redirectURIQueryParams: Omit<
      CodeResponse,
      "error" | "error_description" | "error_uri"
    >;
    pkceCodeVerifier?: string;
  };
}
