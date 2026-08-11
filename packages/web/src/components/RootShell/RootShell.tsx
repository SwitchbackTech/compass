import { Outlet } from "@tanstack/react-router";
import { TrialGateModal } from "@web/billing/TrialGateModal";
import { useTrialStatus } from "@web/billing/useTrialStatus";
import { AuthModal } from "@web/components/AuthModal/AuthModal";
import { AuthModalProvider } from "@web/components/AuthModal/AuthModalProvider";
import { OnboardingTour } from "@web/components/OnboardingTour/OnboardingTour";
import { PostOnboardingFlow } from "@web/components/PostOnboardingFlow/PostOnboardingFlow";
import { ReleaseNotesPrompt } from "@web/components/ReleaseNotesPrompt/ReleaseNotesPrompt";
import {
  selectReleaseNotesPromptOpen,
  useReleaseNotesPromptStore,
} from "@web/components/ReleaseNotesPrompt/release-notes-prompt.store";
import { WelcomeGuideModal } from "@web/components/WelcomeModal/WelcomeGuideModal";
import { WelcomeModal } from "@web/components/WelcomeModal/WelcomeModal";
import {
  selectWelcomeGuideOpen,
  useWelcomeGuideStore,
} from "@web/components/WelcomeModal/welcome.guide.store";
import { useKeyboardOnlyMode } from "@web/shortcuts/keyboard-only/useKeyboardOnlyMode";
import {
  useCalendarShellShortcuts,
  useNavigationShortcuts,
} from "@web/shortcuts/useGlobalShortcuts";

/**
 * The auth modal is driven by the router's `?auth=` search param, so its
 * provider must live inside the router (a sibling to `RouterProvider` can't
 * call router hooks). Mounting it at the root route also keeps the modal
 * available on every matched route, including 404s.
 */
export function RootShell() {
  const isReleaseNotesPromptOpen = useReleaseNotesPromptStore(
    selectReleaseNotesPromptOpen,
  );
  const isWelcomeGuideOpen = useWelcomeGuideStore(selectWelcomeGuideOpen);
  const { isExpired: isTrialExpired } = useTrialStatus();
  useNavigationShortcuts();
  useCalendarShellShortcuts();
  useKeyboardOnlyMode();

  // An expired trial owns the whole screen. The onboarding cards sit at
  // Z_INDEX_TOOLTIP (above Z_INDEX_MODAL), so leaving them mounted would let
  // a gated user click straight through the gate and keep touring. AuthModal
  // stays because the gate's only ways forward are sign up and log in.
  if (isTrialExpired) {
    return (
      <AuthModalProvider>
        <Outlet />
        <TrialGateModal />
        <AuthModal />
      </AuthModalProvider>
    );
  }

  return (
    <AuthModalProvider>
      <Outlet />
      <AuthModal />
      <WelcomeModal />
      <OnboardingTour />
      <PostOnboardingFlow />
      {isWelcomeGuideOpen && <WelcomeGuideModal />}
      {isReleaseNotesPromptOpen && <ReleaseNotesPrompt />}
    </AuthModalProvider>
  );
}
