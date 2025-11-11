import { ReactNode } from "react";
import { useNavigate, useNavigation } from "react-router-dom";
import { SessionAuth } from "supertokens-auth-react/recipe/session";
import { AUTH_FAILURE_REASONS } from "@web/common/constants/auth.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const { state } = useNavigation();

  if (state === "loading") return <AbsoluteOverflowLoader />;

  return (
    <SessionAuth
      requireAuth
      doRedirection
      onSessionExpired={() =>
        navigate(
          `${ROOT_ROUTES.LOGIN}?reason=${AUTH_FAILURE_REASONS.USER_SESSION_EXPIRED}`,
        )
      }
    >
      {children}
    </SessionAuth>
  );
};
