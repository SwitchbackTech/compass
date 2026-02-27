import { JsonStructureItem } from "react-cmdk";
import { useSession } from "@web/auth/hooks/session/useSession";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";

/**
 * Returns command palette items for authentication actions.
 * Items are only returned when the user is not authenticated.
 */
export const useAuthCmdItems = (): JsonStructureItem[] => {
  const { authenticated } = useSession();
  const { openModal } = useAuthModal();
  const isAuthFeatureEnabled =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("auth");

  if (authenticated || !isAuthFeatureEnabled) {
    return [];
  }

  return [
    {
      id: "sign-up",
      children: "Sign Up",
      icon: "UserPlusIcon",
      onClick: () => openModal("signUp"),
    },
    {
      id: "log-in",
      children: "Log In",
      icon: "ArrowLeftOnRectangleIcon",
      onClick: () => openModal("login"),
    },
  ];
};
