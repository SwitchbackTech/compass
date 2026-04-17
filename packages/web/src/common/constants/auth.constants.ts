import { z } from "zod";

export const AuthStateSchema = z.object({
  hasAuthenticated: z.boolean().default(false),
  lastKnownEmail: z.string().optional(),
  shouldPromptSignUpAfterAnonymousCalendarChange: z.boolean().default(false),
});

export type AuthState = z.infer<typeof AuthStateSchema>;

export const DEFAULT_AUTH_STATE: AuthState = {
  hasAuthenticated: false,
  shouldPromptSignUpAfterAnonymousCalendarChange: false,
};

export const UNAUTHENTICATED_USER = "UNAUTHENTICATED_USER";
