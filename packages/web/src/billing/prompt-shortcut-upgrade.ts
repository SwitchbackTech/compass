import { createElement } from "react";
import { type Id } from "react-toastify";
import { track } from "@web/auth/posthog/track";
import {
  getBillingWriteLockStatus,
  isBillingWriteLocked,
} from "@web/billing/billing-write-lock";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { hasAppLockReason } from "@web/shortcuts/app-lock";
import { type ShortcutFeatureArea } from "@web/shortcuts/tips/shortcut-tips.data";

export const SHORTCUT_UPGRADE_TOAST_ID: Id = "shortcut-upgrade-toast";

const PRESENTATION_DEDUPE_MS = 30 * 1000;

export type ShortcutUpgradePromptSource = "keyboard" | "command_palette";

export type ShortcutUpgradePromptInput = {
  featureArea: ShortcutFeatureArea;
  actionId?: string;
  source: ShortcutUpgradePromptSource;
};

let lastPresentationKey = "";
let lastPresentationAt = 0;

const promptCopy = (
  featureArea: ShortcutFeatureArea,
): { title: string; cta: string } => {
  const status = getBillingWriteLockStatus();
  const cta = status === "awaiting_checkout" ? "Start trial" : "Subscribe";
  if (featureArea === "event_creation") {
    return {
      title:
        "Unlock event creation shortcuts with Premium. Upgrade in 30 seconds.",
      cta,
    };
  }
  return {
    title:
      "Unlock event editing shortcuts with Premium. Upgrade in 30 seconds.",
    cta,
  };
};

/**
 * Replaces the full-screen billing gate for a locked write shortcut: step
 * into look-around if the gate currently owns the screen, then show a
 * focused upgrade toast that stays on the calendar.
 */
export function promptShortcutUpgrade(
  input: ShortcutUpgradePromptInput,
  now = Date.now(),
): void {
  if (!isBillingWriteLocked()) return;

  if (hasAppLockReason("billingGate")) {
    enterBillingLookAround();
  }

  const copy = promptCopy(input.featureArea);
  const presentationKey = `${input.featureArea}:${input.actionId ?? ""}:${input.source}`;
  if (
    presentationKey !== lastPresentationKey ||
    now - lastPresentationAt >= PRESENTATION_DEDUPE_MS
  ) {
    lastPresentationKey = presentationKey;
    lastPresentationAt = now;
    track("shortcut_upgrade_prompted", {
      feature_area: input.featureArea,
      source: input.source,
      ...(input.actionId ? { action_id: input.actionId } : {}),
    });
    track("billing_gate_shown", {
      status: getBillingWriteLockStatus() ?? "awaiting_checkout",
      surface: "shortcut_prompt",
    });
  }

  showUpgradeToast(copy.title, copy.cta);
}

/**
 * Lazy so this module can sit on the `useAppShortcut` hot path without a
 * boot-time cycle through toast CTAs (`ToastActionButton` →
 * `useNoticeActionShortcut` → `useAppShortcut`) or Google availability
 * (`billing-preview.store` → delayed/reconnect toasts → `AppConfigApi`).
 */
function enterBillingLookAround(): void {
  void import("@web/billing/billing-preview.store").then(
    ({ billingPreviewActions }) => {
      billingPreviewActions.enter();
    },
  );
}

function showUpgradeToast(title: string, ctaLabel: string): void {
  void import("@web/billing/ShortcutUpgradeToast").then(
    ({ ShortcutUpgradeToast }) => {
      showStatusToast(
        SHORTCUT_UPGRADE_TOAST_ID,
        createElement(ShortcutUpgradeToast, {
          toastId: SHORTCUT_UPGRADE_TOAST_ID,
          title,
          ctaLabel,
        }),
      );
    },
  );
}

export function resetShortcutUpgradePromptForTests(): void {
  lastPresentationKey = "";
  lastPresentationAt = 0;
}
