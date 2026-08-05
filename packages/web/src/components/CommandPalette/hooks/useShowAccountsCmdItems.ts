import { UsersIcon } from "@phosphor-icons/react";
import { useSession } from "@web/auth/compass/session/useSession";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";
import { settingsActions } from "@web/settings/settings.store";

/**
 * The single palette entry for account management: opens Settings, which
 * holds adding/disconnecting a Google account, exporting data, and deleting
 * the Compass account. Those used to also be separate top-level palette
 * items (add-account, delete-account, export-my-data), which cluttered any
 * "acc"-ish search with four near-duplicate rows - they're covered here via
 * keywords instead.
 */
export const useShowAccountsCmdItems = (): CommandItem[] => {
  const { authenticated } = useSession();

  if (!authenticated) {
    return [];
  }

  return [
    {
      id: "show-accounts",
      label: "Manage Accounts",
      icon: UsersIcon,
      shortcut: ["Mod", ","],
      keywords: [
        "settings",
        "accounts",
        "account",
        "preferences",
        "options",
        "add account",
        "connect google",
        "disconnect account",
        "remove account",
        "export data",
        "delete account",
      ],
      onClick: settingsActions.openSettings,
    },
  ];
};
