import { type Credentials, type TokenPayload } from "google-auth-library";
import { type User } from "supertokens-node";
import { z } from "zod/v4";

export interface Result_Auth_Compass {
  status: "OK";
  createdNewRecipeUser: boolean;
  user: User;
}

export interface UserInfo_Google {
  gUser: TokenPayload;
  tokens: Credentials;
}

export const GoogleAuthCodeRequestSchema = z.object({
  thirdPartyId: z.literal("google"),
  clientType: z.literal("web"),
  redirectURIInfo: z.object({
    redirectURIOnProviderDashboard: z.string().nonempty(),
    redirectURIQueryParams: z.object({
      code: z.string().nonempty(),
      scope: z.string().optional(),
      state: z.string().optional(),
    }),
    pkceCodeVerifier: z.string().optional(),
  }),
});

export type GoogleAuthCodeRequest = z.infer<typeof GoogleAuthCodeRequestSchema>;

export const ApiErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string().min(1),
});

const GoogleConnectErrorCodeSchema = z.enum([
  "GOOGLE_ACCOUNT_ALREADY_CONNECTED",
  "GOOGLE_CONNECT_EMAIL_MISMATCH",
  "GOOGLE_NOT_CONFIGURED",
  // Google withheld a refresh token because this browser already consented
  // to the app before (e.g. a prior signup attempt failed after Google-side
  // consent but before Compass finished linking). Retrying with `prompt:
  // consent` forces Google to re-issue one.
  "GOOGLE_REFRESH_TOKEN_MISSING",
]);

export const GoogleConnectErrorResponseSchema = ApiErrorResponseSchema.extend({
  code: GoogleConnectErrorCodeSchema,
});

export type GoogleConnectErrorResponse = z.infer<
  typeof GoogleConnectErrorResponseSchema
>;
