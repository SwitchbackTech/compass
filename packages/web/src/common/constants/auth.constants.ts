import { z } from "zod";

export const AuthStateSchema = z.object({
  hasAuthenticated: z.boolean().default(false),
  lastKnownEmail: z.string().email().optional(),
});

export type AuthState = z.infer<typeof AuthStateSchema>;

export const DEFAULT_AUTH_STATE: AuthState = {
  hasAuthenticated: false,
};

export const UNAUTHENTICATED_USER = "UNAUTHENTICATED_USER";
