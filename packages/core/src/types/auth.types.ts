import { type Credentials, type TokenPayload } from "google-auth-library";
import { type User } from "supertokens-node";
import { z } from "zod";

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

export const GoogleConnectResponseSchema = z.object({
  status: z.literal("OK"),
});

export type GoogleConnectResponse = z.infer<typeof GoogleConnectResponseSchema>;

export const ApiErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string().min(1),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

const GoogleConnectErrorCodeSchema = z.enum([
  "GOOGLE_ACCOUNT_ALREADY_CONNECTED",
  "GOOGLE_CONNECT_EMAIL_MISMATCH",
  "GOOGLE_NOT_CONFIGURED",
]);

export const GoogleConnectErrorResponseSchema = ApiErrorResponseSchema.extend({
  code: GoogleConnectErrorCodeSchema,
});

export type GoogleConnectErrorResponse = z.infer<
  typeof GoogleConnectErrorResponseSchema
>;

export const AppConfigSchema = z.object({
  google: z.object({
    isConfigured: z.boolean(),
  }),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
