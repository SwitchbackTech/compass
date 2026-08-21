import { Outlet, useLocation } from "@tanstack/react-router";
import { BillingGateModal } from "@web/billing/BillingGateModal";
import { BillingPastDueBanner } from "@web/billing/BillingPastDueBanner";
import { useCheckoutReturn } from "@web/billing/billing.query";
import { TrialGateModal } from "@web/billing/TrialGateModal";
import { useAppAccess } from "@web/billing/useAppAccess";
import { AuthModal } from "@web/components/AuthModal/AuthModal";
import { AuthModalProvider } from "@web/components/AuthModal/AuthModalProvider";
import { FirstEventPrompt } from "@web/components/FirstEventPrompt/FirstEventPrompt";
import { ShortcutShowcase } from "@web/components/ShortcutShowcase/ShortcutShowcase";
import { WelcomeGuideModal } from "@web/components/WelcomeModal/WelcomeGuideModal";
import { WelcomeModal } from "@web/components/WelcomeModal/WelcomeModal";
import {
  selectWelcomeGuideOpen,
  useWelcomeGuideStore,
} from "@web/components/WelcomeModal/welcome.guide.store";
import { useKeyboardOnlyMode } from "@web/shortcuts/keyboard-only/useKeyboardOnlyMode";
import { useFocusNoticeShortcut } from "@web/shortcuts/notice-focus/useFocusNoticeShortcut";
import {
  useCalendarShellShortcuts,
  useNavigationShortcuts,
} from "@web/shortcuts/useGlobalShortcuts";
import { isLifePathname } from "./isLifePathname";

/**
 * The auth modal is driven by the router's `?auth=` search param, so its
 * provider must live inside the router (a sibling to `RouterProvider` can't
 * call router hooks). Mounting it at the root route also keeps the modal
 * available on every matched route, including 404s.
 */
export function RootShell() {
  const { pathname } = useLocation();
  const deferCalendarOnboarding = isLifePathname(pathname);
  const isWelcomeGuideOpen = useWelcomeGuideStore(selectWelcomeGuideOpen);
  const access = useAppAccess();
  useCheckoutReturn();
  useNavigationShortcuts();
  useCalendarShellShortcuts();
  useKeyboardOnlyMode();
  useFocusNoticeShortcut();

  const showTrialGate = access.kind === "anonymous-trial" && access.isExpired;
  const showBillingGate = access.kind === "server" && access.isReadOnly;
  const showPastDue = access.kind === "server" && access.status === "past_due";

  // An expired trial owns the whole screen. The onboarding cards sit at
  // Z_INDEX_TOOLTIP (above Z_INDEX_MODAL), so leaving them mounted would let
  // a gated user click straight through the gate and keep touring. AuthModal
  // stays because the gate's only ways forward are sign up and log in.
  if (showTrialGate) {
    return (
      <AuthModalProvider>
        <Outlet />
        <TrialGateModal />
        <AuthModal />
      </AuthModalProvider>
    );
  }

  if (showBillingGate) {
    return (
      <AuthModalProvider>
        <Outlet />
        <BillingGateModal status={access.status} />
        <AuthModal />
      </AuthModalProvider>
    );
  }

  return (
    <AuthModalProvider>
      {showPastDue && <BillingPastDueBanner />}
      <Outlet />
      <AuthModal />
      {!deferCalendarOnboarding && <WelcomeModal />}
      {!deferCalendarOnboarding && <ShortcutShowcase />}
      {!deferCalendarOnboarding && <FirstEventPrompt />}
      {isWelcomeGuideOpen && <WelcomeGuideModal />}
    </AuthModalProvider>
  );
}
