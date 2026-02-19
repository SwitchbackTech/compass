import { AuthApi } from "@web/common/apis/auth.api";
import { syncLocalEventsToCloud } from "@web/common/utils/sync/local-event-sync.util";
import { SignInUpInput } from "@web/components/oauth/ouath.types";

export interface AuthenticateResult {
  success: boolean;
  error?: Error;
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
