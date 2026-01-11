import { z } from "zod";

export const AuthStateSchema = z.object({
  isGoogleAuthenticated: z.boolean().default(false),
});

export type AuthState = z.infer<typeof AuthStateSchema>;

export const DEFAULT_AUTH_STATE: AuthState = {
  isGoogleAuthenticated: false,
};

export const UNAUTHENTICATED_USER = "UNAUTHENTICATED_USER";
