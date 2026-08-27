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

  const readOnlyStatus =
    access.kind === "server" && access.isReadOnly ? access.status : null;
  // The look-around is an invitation to start a trial, so it only holds while
  // one is still on offer. If the status moves on (expired, canceled) while
  // previewing, the gate must come back rather than strand the user behind a
  // banner pitching a trial they can no longer take.
  const isPreviewable = readOnlyStatus === "awaiting_checkout";
  const showReadOnlyBanner = isPreviewable && isPreviewing;
  const gateStatus = showReadOnlyBanner ? null : readOnlyStatus;
  const showPastDue = access.kind === "server" && access.status === "past_due";

  // The gate owns the screen: the onboarding cards sit at Z_INDEX_TOOLTIP
  // (above Z_INDEX_MODAL), so leaving them mounted would let a gated user
  // click straight through it and keep touring. They are suppressed rather
  // than living in a second copy of this tree, which keeps Outlet's slot
  // stable — swapping tree shapes remounts the whole calendar.
  return (
    <AuthModalProvider>
      {showPastDue && <BillingPastDueBanner />}
      {showReadOnlyBanner && <BillingReadOnlyBanner />}
      <Outlet />
      <AuthModal />
      {gateStatus !== null && <BillingGateModal status={gateStatus} />}
      {gateStatus === null && !deferCalendarOnboarding && <WelcomeModal />}
      {gateStatus === null && !deferCalendarOnboarding && <ShortcutShowcase />}
      {gateStatus === null && !deferCalendarOnboarding && <FirstEventPrompt />}
      {gateStatus === null && isWelcomeGuideOpen && <WelcomeGuideModal />}
      <PointerHint />
    </AuthModalProvider>
  );
}
