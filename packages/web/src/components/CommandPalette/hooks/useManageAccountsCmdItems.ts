import { UsersIcon } from "@phosphor-icons/react";
import { useSession } from "@web/auth/compass/session/useSession";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";
import { useManageAccounts } from "@web/components/ManageAccounts/hooks/useManageAccounts";

export const useManageAccountsCmdItems = (): CommandItem[] => {
  const { authenticated } = useSession();
  const { openManageAccounts } = useManageAccounts();

  if (!authenticated) {
    return [];
  }

  return [
    {
      id: "manage-accounts",
      label: "Add/remove accounts",
      icon: UsersIcon,
      onClick: openManageAccounts,
    },
  ];
};
