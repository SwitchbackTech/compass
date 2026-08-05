import { PlusIcon } from "@phosphor-icons/react";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";

/**
 * Connects another Google account - the palette's counterpart to the
 * sidebar's own Connect button, which only covers the FIRST account.
 * Offered once a first account is already healthy, same gating the sidebar's
 * old hover-revealed plus icon used before it moved here (too easy to miss
 * or misread as decorative).
 */
export const useAddAccountCmdItems = (): CommandItem[] => {
  const { connect, isAvailable, isConnecting, state } = useConnectGoogle();

  if (!isAvailable || (state !== "HEALTHY" && state !== "IMPORTING")) {
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
