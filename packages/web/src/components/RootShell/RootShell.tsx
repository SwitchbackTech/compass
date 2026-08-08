import { Outlet } from "@tanstack/react-router";
import { AuthModal } from "@web/components/AuthModal/AuthModal";
import { AuthModalProvider } from "@web/components/AuthModal/AuthModalProvider";
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
  useNavigationShortcuts();
  useCalendarShellShortcuts();
  useKeyboardOnlyMode();

  return (
    <AuthModalProvider>
      <Outlet />
      <AuthModal />
      <WelcomeModal />
      {isWelcomeGuideOpen && <WelcomeGuideModal />}
      {isReleaseNotesPromptOpen && <ReleaseNotesPrompt />}
    </AuthModalProvider>
  );
}
