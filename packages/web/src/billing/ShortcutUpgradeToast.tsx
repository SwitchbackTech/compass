import { type Id } from "react-toastify";
import { useBillingRedirect } from "@web/billing/useBillingRedirect";
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
  const { isRedirecting, redirectTo } = useBillingRedirect();

  const handleUpgrade = () => {
    void redirectTo("checkout", "shortcut_prompt");
    getToast().dismiss(toastId);
  };

  return (
    <ToastNotice>
      <p className="text-sm text-text">{title}</p>
      <ToastActionButton onClick={handleUpgrade}>
        {isRedirecting ? "Opening Stripe…" : ctaLabel}
      </ToastActionButton>
    </ToastNotice>
  );
}
