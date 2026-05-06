import { z } from "zod";
import {
  GOOGLE_AUTH_INTENT_MAX_AGE_MS,
  GOOGLE_AUTH_INTENT_STORAGE_PREFIX,
} from "./google-authorization.constants";

export const GoogleAuthorizationIntentSchema = z.object({
  intent: z.enum(["signIn", "connectCalendar"]),
  returnPath: z
    .string()
    .startsWith("/")
    .refine((path) => !path.startsWith("//")),
  createdAt: z.number(),
});

export type GoogleAuthorizationIntent = z.infer<
  typeof GoogleAuthorizationIntentSchema
>;

const getStorageKey = (state: string) =>
  `${GOOGLE_AUTH_INTENT_STORAGE_PREFIX}.${state}`;

export function writeGoogleAuthorizationIntent(
  state: string,
  intent: GoogleAuthorizationIntent,
): void {
  sessionStorage.setItem(getStorageKey(state), JSON.stringify(intent));
}

export function readGoogleAuthorizationIntent(
  state: string,
): GoogleAuthorizationIntent | null {
  const key = getStorageKey(state);
  const stored = sessionStorage.getItem(key);

  if (!stored) {
    return null;
  }

  let storedIntent: unknown;

  try {
    storedIntent = JSON.parse(stored);
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }

  const parsed = GoogleAuthorizationIntentSchema.safeParse(storedIntent);

  if (!parsed.success) {
    sessionStorage.removeItem(key);
    return null;
  }

  const isExpired =
    Date.now() - parsed.data.createdAt > GOOGLE_AUTH_INTENT_MAX_AGE_MS;

  if (isExpired) {
    sessionStorage.removeItem(key);
    return null;
  }

  return parsed.data;
}

export function clearGoogleAuthorizationIntent(state: string): void {
  sessionStorage.removeItem(getStorageKey(state));
}
