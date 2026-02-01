import { AuthApi } from "@web/common/apis/auth.api";
import { UserApi } from "@web/common/apis/user.api";
import { syncLocalEventsToCloud } from "@web/common/utils/sync/local-event-sync.util";
import { SignInUpInput } from "@web/components/oauth/ouath.types";

export interface AuthenticateResult {
  success: boolean;
  error?: Error;
}

export interface OnboardingStatusResult {
  skipOnboarding: boolean;
}

export interface SyncLocalEventsResult {
  syncedCount: number;
  success: boolean;
  error?: Error;
}

/**
 * Authenticate with Google using the provided credentials.
 */
export async function authenticate(
  data: SignInUpInput,
): Promise<AuthenticateResult> {
  try {
    await AuthApi.loginOrSignup(data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

/**
 * Fetch onboarding status from the server.
 * Returns skipOnboarding: true as default if the request fails.
 */
export async function fetchOnboardingStatus(): Promise<OnboardingStatusResult> {
  try {
    const metadata = await UserApi.getMetadata();
    return { skipOnboarding: metadata.skipOnboarding ?? true };
  } catch {
    return { skipOnboarding: true };
  }
}

/**
 * Sync local events to the cloud.
 */
export async function syncLocalEvents(): Promise<SyncLocalEventsResult> {
  try {
    const syncedCount = await syncLocalEventsToCloud();
    return { syncedCount, success: true };
  } catch (error) {
    return { syncedCount: 0, success: false, error: error as Error };
  }
}
