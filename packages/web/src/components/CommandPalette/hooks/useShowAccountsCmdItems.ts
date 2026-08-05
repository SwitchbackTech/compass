import { UsersIcon } from "@phosphor-icons/react";
import { useSession } from "@web/auth/compass/session/useSession";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";
import { settingsActions } from "@web/settings/settings.store";

export const useShowAccountsCmdItems = (): CommandItem[] => {
  const { authenticated } = useSession();

  if (!authenticated) {
    return [];
  }

  return [
    {
      id: "show-accounts",
      label: "Settings",
      icon: UsersIcon,
      shortcut: ["Mod", ","],
      keywords: ["accounts", "account", "preferences", "options"],
      onClick: settingsActions.openSettings,
    },
  ];
};
