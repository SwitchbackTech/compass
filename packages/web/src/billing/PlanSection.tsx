import { type FC } from "react";
import dayjs from "@core/util/date/dayjs";
import {
  getPlanBadge,
  PLAN_BADGE_TONE_CLASSNAME,
} from "@web/billing/planBadge";
import { useAppAccess } from "@web/billing/useAppAccess";
import { useBillingRedirect } from "@web/billing/useBillingRedirect";
import { focusOnPointerEnter } from "@web/common/utils/focus-on-pointer-enter";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import { settingsShortcutAttrs } from "@web/settings/useSettingsShortcuts";
import { pointerPassAttributes } from "@web/shortcuts/keyboard-only/pointer-action";

const OUTLINE_BUTTON_CLASSNAME =
  "c-focus-ring inline-flex shrink-0 items-center rounded border border-border bg-surface-overlay px-2 py-1 text-xs text-text transition-colors hover:bg-surface-panel disabled:pointer-events-none disabled:opacity-60";

/**
 * The account view's answer to "what am I paying for?". Until this existed,
 * every billing surface in the app was a gate or a warning, so a happy
 * subscriber had no way to confirm their own standing.
 *
 * Renders nothing when there is no plan to report (self-hosted, enforcement
 * paused, anonymous), rather than inventing billing chrome for installs that
 * have no billing.
 */
export const PlanSection: FC<{
  showShortcuts?: boolean;
}> = ({ showShortcuts = false }) => {
  const access = useAppAccess();
  const { isRedirecting, redirectTo } = useBillingRedirect();
  const badge = getPlanBadge(access);

  if (!badge) return null;

  const trialEndsAt =
    access.kind === "server" && access.status === "trialing"
      ? access.trialEndsAt
      : null;

  return (
    <div>
      <p className="mb-1 block text-sm text-text">Plan</p>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span
            className={`shrink-0 rounded border border-border px-1.5 text-xs ${PLAN_BADGE_TONE_CLASSNAME[badge.tone]}`}
          >
            {badge.label}
          </span>
          {trialEndsAt ? (
            <p className="mt-1 text-text-muted text-xs">
              Your trial ends {dayjs(trialEndsAt).format("MMM D, YYYY")}. Press{" "}
              <ShortcutKeys keys="B" /> to subscribe now.
            </p>
          ) : null}
        </div>
        <button
          className={OUTLINE_BUTTON_CLASSNAME}
          disabled={isRedirecting}
          onClick={() => void redirectTo("portal", "settings_portal")}
          onPointerEnter={focusOnPointerEnter}
          type="button"
          {...pointerPassAttributes}
          {...settingsShortcutAttrs("manage-billing")}
        >
          {isRedirecting ? "Opening Stripe…" : "Manage billing"}
          {showShortcuts ? <ShortcutKeys className="ml-2" keys="M" /> : null}
        </button>
      </div>
    </div>
  );
};
