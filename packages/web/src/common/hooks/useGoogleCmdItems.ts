import { type JsonStructureItem } from "react-cmdk";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";

export const useGoogleCmdItems = (): JsonStructureItem[] => {
  const { commandAction, isAvailable } = useConnectGoogle();

  if (!isAvailable) {
    return [];
  }

  return [
    {
      id: "connect-google-calendar",
      children: commandAction.label,
      icon: commandAction.icon,
      disabled: commandAction.isDisabled,
      onClick: commandAction.onSelect,
    },
  ];
};
