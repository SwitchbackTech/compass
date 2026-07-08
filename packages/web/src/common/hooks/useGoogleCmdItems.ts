import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";

export const useGoogleCmdItems = (): CommandItem[] => {
  const { commandAction, isAvailable } = useConnectGoogle();

  if (!isAvailable) {
    return [];
  }

  return [
    {
      id: "connect-google-calendar",
      label: commandAction.label,
      icon: commandAction.icon,
      disabled: commandAction.isDisabled,
      onClick: commandAction.onSelect,
    },
  ];
};
