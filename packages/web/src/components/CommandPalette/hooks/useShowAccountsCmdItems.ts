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
      label: "Show accounts",
      icon: UsersIcon,
      shortcut: ["Mod", ","],
      onClick: settingsActions.openSettings,
    },
  ];
};
