import { PlusIcon } from "@phosphor-icons/react";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";

/**
 * Connects a Google account. Gated only on Google being configured at all -
 * matching Settings' "Add account" button, so the two can't disagree about
 * when this is offered (previously this required a first account already
 * healthy/importing, so a broken first account hid it here while Settings
 * still showed it).
 */
export const useAddAccountCmdItems = (): CommandItem[] => {
  const { connect, isAvailable, isConnecting } = useConnectGoogle();

  if (!isAvailable) {
    return [];
  }

  return [
    {
      id: "add-account",
      label: "Add account",
      icon: PlusIcon,
      disabled: isConnecting,
      onClick: connect,
    },
  ];
};
