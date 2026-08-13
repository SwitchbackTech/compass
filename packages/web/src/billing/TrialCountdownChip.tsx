import { type FC } from "react";
import { track } from "@web/auth/posthog/track";
import { useAppAccess } from "@web/billing/useAppAccess";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const remaining = Math.ceil((Date.parse(iso) - Date.now()) / MS_PER_DAY);
  return Number.isNaN(remaining) ? null : Math.max(0, remaining);
}

/**
 * Sidebar status bar slot: quiet countdown for the anonymous browser trial
 * and for authenticated users still in a server-side trial.
 */
export const TrialCountdownChip: FC = () => {
  const access = useAppAccess();
  const { openModal } = useAuthModal();

  if (access.kind === "anonymous-trial" && !access.isExpired) {
    const isUrgent = access.daysLeft <= 2;
    return (
      <button
        className={`c-focus-ring truncate text-xs ${isUrgent ? "font-semibold text-warning" : "text-text-muted"}`}
        onClick={() => {
          track("signup_started", { source: "trial_chip" });
          openModal("signUp");
        }}
        type="button"
      >
        Trial: {access.daysLeft} {access.daysLeft === 1 ? "day" : "days"} left
      </button>
    );
  }

  if (access.kind === "server" && access.status === "trialing") {
    const daysLeft = daysUntil(access.trialEndsAt);
    if (daysLeft === null || daysLeft <= 0) return null;
    const isUrgent = daysLeft <= 2;
    return (
      <p
        className={`truncate text-xs ${isUrgent ? "font-semibold text-warning" : "text-text-muted"}`}
      >
        Trial: {daysLeft} {daysLeft === 1 ? "day" : "days"} left
      </p>
    );
  }

  return null;
};
