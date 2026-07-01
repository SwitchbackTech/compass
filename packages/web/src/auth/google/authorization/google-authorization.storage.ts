import { z } from "zod";
import { sessionBrowserStore } from "@web/common/storage/browser-key-value.store";
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
  sessionBrowserStore.set(getStorageKey(state), JSON.stringify(intent));
}

export function readGoogleAuthorizationIntent(
  state: string,
): GoogleAuthorizationIntent | null {
  const key = getStorageKey(state);
  const stored = sessionBrowserStore.get(key);

  if (!stored) {
    return null;
  }

  let storedIntent: unknown;

  try {
    storedIntent = JSON.parse(stored);
  } catch {
    sessionBrowserStore.remove(key);
    return null;
  }

  const parsed = GoogleAuthorizationIntentSchema.safeParse(storedIntent);

  if (!parsed.success) {
    sessionBrowserStore.remove(key);
    return null;
  }

  const isExpired =
    Date.now() - parsed.data.createdAt > GOOGLE_AUTH_INTENT_MAX_AGE_MS;

  if (isExpired) {
    sessionBrowserStore.remove(key);
    return null;
  }

  return parsed.data;
}

export function clearGoogleAuthorizationIntent(state: string): void {
  sessionBrowserStore.remove(getStorageKey(state));
}
