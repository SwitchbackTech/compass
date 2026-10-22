import { isPublicBookingPath } from "@core/booking/booking-telemetry";
import { isMeetingSetupRequested } from "@web/booking/meeting-setup.search";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { hasPlayDeepLink } from "@web/components/ShortcutShowcase/play-link";

function meetingSetupRequestedFromSearch(search?: {
  meetingSetup?: unknown;
}): boolean {
  if (!search) return false;
  const value = search.meetingSetup;
  if (
    typeof value !== "string" &&
    typeof value !== "number" &&
    typeof value !== "boolean"
  ) {
    return false;
  }
  return isMeetingSetupRequested({ meetingSetup: value });
}

export function isWelcomeOnboardingPathBlocked(
  pathname: string,
  search?: { meetingSetup?: unknown },
): boolean {
  if (isPublicBookingPath(pathname)) return true;
  if (meetingSetupRequestedFromSearch(search)) return true;
  return false;
}

/** Synchronous read for WelcomeModal's first paint before router effects run. */
export function isWelcomeOnboardingPathBlockedFromWindow(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const meetingSetup = params.get("meetingSetup");
  return isWelcomeOnboardingPathBlocked(window.location.pathname, {
    meetingSetup: meetingSetup ?? undefined,
  });
}

export function hasSeenWelcome(): boolean {
  if (!persistentBrowserStore.isAvailable()) return true;
  return persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_WELCOME) === "true";
}

export function markWelcomeSeen(exitCta?: string): void {
  persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_WELCOME, "true");
  if (exitCta) {
    persistentBrowserStore.set(STORAGE_KEYS.WELCOME_EXIT, exitCta);
  }
}

export function readWelcomeExit(): string | null {
  if (!persistentBrowserStore.isAvailable()) return null;
  return persistentBrowserStore.get(STORAGE_KEYS.WELCOME_EXIT);
}

/**
 * Whether the welcome modal should claim the onboarding surface slot. A
 * visitor who arrived for the meeting setup wizard (`/?meetingSetup=1`) came
 * for a meeting page, not the keyboard pitch: keep the modal out of the way
 * until that setup ends or hands off to sign-up.
 */
export function selectWelcomeModalSurfaceEligible(
  showCalendarOnboarding: boolean,
  authenticated: boolean,
  isFirstVisitOpen: boolean,
  guestMeetingSetupActive: boolean,
  onboardingPathBlocked: boolean,
): boolean {
  if (!showCalendarOnboarding) return false;
  if (authenticated) return false;
  if (guestMeetingSetupActive) return false;
  if (onboardingPathBlocked) return false;
  if (hasPlayDeepLink()) return false;
  if (!hasSeenWelcome()) return true;
  // Explore marks welcome seen before the fade finishes; keep the slot until
  // WelcomeModal clears first-visit open.
  return isFirstVisitOpen;
}
