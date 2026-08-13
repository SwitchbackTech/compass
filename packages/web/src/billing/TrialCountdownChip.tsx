import { type FC } from "react";
import { track } from "@web/auth/posthog/track";
import { useAppAccess } from "@web/billing/useAppAccess";
import { useTrialStatus } from "@web/billing/useTrialStatus";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const remaining = Math.ceil((Date.parse(iso) - Date.now()) / MS_PER_DAY);
  return Number.isNaN(remaining) ? null : Math.max(0, remaining);
}

/**
 * Sidebar status bar slot: quiet countdown for the anonymous browser trial
 * (same clock as TrialGateModal) and for authenticated users still trialing.
 *
 * Anonymous rendering goes through `useTrialStatus`, not `useAppAccess`, so a
 * process-wide test mock of the server hook cannot hide the visitor chip.
 */
export const TrialCountdownChip: FC = () => {
  const { isExpired, daysLeft, isAnonymousTrial } = useTrialStatus();
  const access = useAppAccess();
  const { openModal } = useAuthModal();

  if (isAnonymousTrial && !isExpired) {
    const isUrgent = daysLeft <= 2;
    return (
      <button
        className={`c-focus-ring truncate text-xs ${isUrgent ? "font-semibold text-warning" : "text-text-muted"}`}
        onClick={() => {
          track("signup_started", { source: "trial_chip" });
          openModal("signUp");
        }}
        type="button"
      >
        Trial: {daysLeft} {daysLeft === 1 ? "day" : "days"} left
      </button>
    );
  }

  if (access.kind === "server" && access.status === "trialing") {
    const serverDaysLeft = daysUntil(access.trialEndsAt);
    if (serverDaysLeft === null || serverDaysLeft <= 0) return null;
    const isUrgent = serverDaysLeft <= 2;
    return (
      <p
        className={`truncate text-xs ${isUrgent ? "font-semibold text-warning" : "text-text-muted"}`}
      >
        Trial: {serverDaysLeft} {serverDaysLeft === 1 ? "day" : "days"} left
      </p>
    );
  }

  return null;
};
