import { type FC } from "react";
import { track } from "@web/auth/posthog/track";
import { useTrialStatus } from "@web/billing/useTrialStatus";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";

/**
 * Sidebar status bar slot: quiet countdown for the anonymous browser trial.
 * Never shown for authenticated users (server billing status governs them).
 */
export const TrialCountdownChip: FC = () => {
  const { isExpired, daysLeft, isAnonymousTrial } = useTrialStatus();
  const { openModal } = useAuthModal();

  if (!isAnonymousTrial || isExpired) return null;

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
};
