import { CreditCardIcon } from "@phosphor-icons/react";
import { useSession } from "@web/auth/compass/session/useSession";
import { getPlanBadge } from "@web/billing/planBadge";
import { useAppAccess } from "@web/billing/useAppAccess";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";
import { settingsActions } from "@web/settings/settings.store";

/** Opens Settings on Billing when the install actually has a plan to report. */
export const useShowBillingCmdItems = (): CommandItem[] => {
  const { authenticated } = useSession();
  const access = useAppAccess();
  const badge = getPlanBadge(access);

  if (!authenticated || !badge) {
    return [];
  }

  return [
    {
      id: "show-billing",
      label: "Manage Billing",
      icon: CreditCardIcon,
      keywords: [
        "plan",
        "billing",
        "subscription",
        "premium",
        "trial",
        "payment",
        "invoice",
        "card",
      ],
      badge: badge.label,
      onClick: () =>
        settingsActions.openSettings("billing", { fromPalette: true }),
    },
  ];
};
