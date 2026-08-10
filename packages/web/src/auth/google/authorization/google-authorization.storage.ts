import { z } from "zod/v4";
import { sessionBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  GOOGLE_AUTH_INTENT_MAX_AGE_MS,
  GOOGLE_AUTH_INTENT_STORAGE_PREFIX,
} from "./google-authorization.constants";

export const GoogleAuthorizationIntentSchema = z.object({
  intent: z.literal("signIn"),
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

// Not keyed by state (unlike the intent above): this needs to survive INTO
// the next authorization attempt, which mints a fresh state of its own. Set
// when Google withholds a refresh token because this browser already
// consented once before (GOOGLE_REFRESH_TOKEN_MISSING) - the next attempt
// must pass prompt=consent or it fails the exact same way, forever.
const NEEDS_CONSENT_RETRY_KEY = `${GOOGLE_AUTH_INTENT_STORAGE_PREFIX}.needsConsentRetry`;

export function markGoogleAuthNeedsConsentRetry(): void {
  sessionBrowserStore.set(NEEDS_CONSENT_RETRY_KEY, "1");
}

// Read-and-clear: the flag is consumed by exactly the next attempt, not every
// attempt afterward.
export function consumeGoogleAuthNeedsConsentRetry(): boolean {
  const needsRetry = sessionBrowserStore.get(NEEDS_CONSENT_RETRY_KEY) !== null;
  if (needsRetry) {
    sessionBrowserStore.remove(NEEDS_CONSENT_RETRY_KEY);
  }
  return needsRetry;
}
