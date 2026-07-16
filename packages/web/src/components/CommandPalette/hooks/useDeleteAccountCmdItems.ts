import { TrashIcon } from "@phosphor-icons/react";
import { useSession } from "@web/auth/compass/session/useSession";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";
import { useDeleteAccountConfirmation } from "@web/components/DeleteAccountConfirmation/hooks/useDeleteAccountConfirmation";

export const useDeleteAccountCmdItems = (): CommandItem[] => {
  const { authenticated } = useSession();
  const { openDeleteAccountConfirmation } = useDeleteAccountConfirmation();

  if (!authenticated) {
    return [];
  }

  return [
    {
      id: "delete-account",
      label: "Delete account",
      icon: TrashIcon,
      onClick: openDeleteAccountConfirmation,
    },
  ];
};
