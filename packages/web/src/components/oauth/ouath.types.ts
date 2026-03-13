import { type CodeResponse } from "@react-oauth/google";
import { type GoogleAuthIntent } from "@core/types/google-auth.types";

export interface SignInUpInput {
  thirdPartyId: string;
  clientType: "web";
  googleAuthIntent?: GoogleAuthIntent;
  redirectURIInfo: {
    redirectURIOnProviderDashboard: string;
    redirectURIQueryParams: Omit<
      CodeResponse,
      "error" | "error_description" | "error_uri"
    >;
    pkceCodeVerifier?: string;
  };
}
