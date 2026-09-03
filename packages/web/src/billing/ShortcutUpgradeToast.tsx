import { type Id } from "react-toastify";
import { track } from "@web/auth/posthog/track";
import { billingPreviewActions } from "@web/billing/billing-preview.store";
import { checkoutPanelActions } from "@web/billing/checkout-panel.store";
import { ToastActionButton } from "@web/common/utils/toast/ToastActionButton";
import { ToastNotice } from "@web/common/utils/toast/ToastNotice";
import { getToast } from "@web/common/utils/toast/toast.port";

export function ShortcutUpgradeToast({
  toastId,
  title,
  ctaLabel,
}: {
  toastId: Id;
  title: string;
  ctaLabel: string;
}) {
  const handleUpgrade = () => {
    track("billing_gate_cta_clicked", { cta: "shortcut_prompt" });
    getToast().dismiss(toastId);
    billingPreviewActions.exit();
    checkoutPanelActions.open();
  };

  return (
    <ToastNotice>
      <p className="text-sm text-text">{title}</p>
      <ToastActionButton onClick={handleUpgrade}>{ctaLabel}</ToastActionButton>
    </ToastNotice>
  );
}
