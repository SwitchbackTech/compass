import { type JsonStructureItem } from "react-cmdk";
import { useSession } from "@web/auth/compass/session/useSession";
import { useLogoutConfirmation } from "@web/components/LogoutConfirmation/hooks/useLogoutConfirmation";

export const useLogoutCmdItems = (): JsonStructureItem[] => {
  const { authenticated } = useSession();
  const { openLogoutConfirmation } = useLogoutConfirmation();

  if (!authenticated) {
    return [];
  }

  return [
    {
      id: "log-out",
      children: "Log Out [z]",
      icon: "ArrowRightOnRectangleIcon",
      onClick: openLogoutConfirmation,
    },
  ];
};
