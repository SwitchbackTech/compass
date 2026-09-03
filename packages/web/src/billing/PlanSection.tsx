import { type FC } from "react";
import dayjs from "@core/util/date/dayjs";
import {
  getPlanBadge,
  PLAN_BADGE_TONE_CLASSNAME,
} from "@web/billing/planBadge";
import { useAppAccess } from "@web/billing/useAppAccess";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";

/**
 * The account view's answer to "what am I paying for?". Until this existed,
 * every billing surface in the app was a gate or a warning, so a happy
 * subscriber had no way to confirm their own standing.
 *
 * Renders nothing when there is no plan to report (self-hosted, enforcement
 * paused, anonymous), rather than inventing billing chrome for installs that
 * have no billing. WP-06 rebuilds the management actions.
 */
export const PlanSection: FC = () => {
  const access = useAppAccess();
  const badge = getPlanBadge(access);

  if (!badge) return null;

  const trialEndsAt =
    access.kind === "server" && access.status === "trialing"
      ? access.trialEndsAt
      : null;
  const cancelScheduled =
    access.kind === "server" && access.cancelAtPeriodEnd === true;

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
              Your trial ends {dayjs(trialEndsAt).format("MMM D, YYYY")}
              {cancelScheduled ? " and will not renew" : ""}. Press{" "}
              <ShortcutKeys keys="B" /> to subscribe now.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};
