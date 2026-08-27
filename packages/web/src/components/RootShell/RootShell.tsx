import { Outlet, useLocation } from "@tanstack/react-router";
import { BillingGateModal } from "@web/billing/BillingGateModal";
import { BillingPastDueBanner } from "@web/billing/BillingPastDueBanner";
import { BillingReadOnlyBanner } from "@web/billing/BillingReadOnlyBanner";
import { useCheckoutReturn } from "@web/billing/billing.query";
import {
  selectBillingPreviewing,
  useBillingPreviewStore,
} from "@web/billing/billing-preview.store";
import { useAppAccess } from "@web/billing/useAppAccess";
import { AuthModal } from "@web/components/AuthModal/AuthModal";
import { AuthModalProvider } from "@web/components/AuthModal/AuthModalProvider";
import { FirstEventPrompt } from "@web/components/FirstEventPrompt/FirstEventPrompt";
import { PointerHint } from "@web/components/PointerHint/PointerHint";
import { ShortcutShowcase } from "@web/components/ShortcutShowcase/ShortcutShowcase";
import { WelcomeGuideModal } from "@web/components/WelcomeModal/WelcomeGuideModal";
import { WelcomeModal } from "@web/components/WelcomeModal/WelcomeModal";
import {
  selectWelcomeGuideOpen,
  useWelcomeGuideStore,
} from "@web/components/WelcomeModal/welcome.guide.store";
import { useEventContextMenuShortcut } from "@web/shortcuts/context-menu/useEventContextMenuShortcut";
import { usePointerSuppression } from "@web/shortcuts/keyboard-only/usePointerSuppression";
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
  const isPreviewing = useBillingPreviewStore(selectBillingPreviewing);
  useCheckoutReturn();
  useNavigationShortcuts();
  useCalendarShellShortcuts();
  usePointerSuppression();
  useFocusNoticeShortcut();
  useEventContextMenuShortcut();

  const isBillingReadOnly = access.kind === "server" && access.isReadOnly;
  const showBillingGate = isBillingReadOnly && !isPreviewing;
  const showReadOnlyBanner = isBillingReadOnly && isPreviewing;
  const showPastDue = access.kind === "server" && access.status === "past_due";

  // The gate owns the whole screen. The onboarding cards sit at
  // Z_INDEX_TOOLTIP (above Z_INDEX_MODAL), so leaving them mounted would let
  // a gated user click straight through the gate and keep touring. Once they
  // choose to look around, the gate unmounts and the normal tree (onboarding
  // included) is safe to render behind the read-only banner.
  if (showBillingGate) {
    return (
      <AuthModalProvider>
        <Outlet />
        <BillingGateModal status={access.status} />
        <AuthModal />
        <PointerHint />
      </AuthModalProvider>
    );
  }

  return (
    <AuthModalProvider>
      {showPastDue && <BillingPastDueBanner />}
      {showReadOnlyBanner && <BillingReadOnlyBanner />}
      <Outlet />
      <AuthModal />
      {!deferCalendarOnboarding && <WelcomeModal />}
      {!deferCalendarOnboarding && <ShortcutShowcase />}
      {!deferCalendarOnboarding && <FirstEventPrompt />}
      {isWelcomeGuideOpen && <WelcomeGuideModal />}
      <PointerHint />
    </AuthModalProvider>
  );
}
