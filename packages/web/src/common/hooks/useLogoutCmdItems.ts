import { type JsonStructureItem } from "react-cmdk";
import { useLogout } from "@web/auth/compass/hooks/useLogout";
import { useSession } from "@web/auth/compass/session/useSession";

export const useLogoutCmdItems = (): JsonStructureItem[] => {
  const { authenticated } = useSession();
  const logout = useLogout();

  if (!authenticated) {
    return [];
  }

  return [
    {
      id: "log-out",
      children: "Log Out [z]",
      icon: "ArrowRightOnRectangleIcon",
      onClick: logout,
    },
  ];
};
