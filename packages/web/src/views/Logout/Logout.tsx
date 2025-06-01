import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Session, { signOut } from "supertokens-auth-react/recipe/session";
import { SyncApi } from "@web/common/apis/sync.api";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { toastWithoutDuplication } from "@web/common/utils/toast";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { StyledLogin } from "../Login/styled";
import { StyledLogoutBtn } from "./styled";

export const LogoutView = () => {
  const navigate = useNavigate();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const isLoggedIn = await Session.doesSessionExist();
      if (!isLoggedIn) {
        toastWithoutDuplication("You're not logged in");
        navigate(ROOT_ROUTES.LOGIN);
      }
    };

    checkSession().catch((e) => {
      toastWithoutDuplication(e);
      console.error(e);
    });
  }, [navigate]);

  const logout = async () => {
    setIsLoggingOut(true);

    await SyncApi.stopWatches();
    await signOut();

    setIsLoggingOut(false);

    toastWithoutDuplication("You logged out - see ya! ✌");
    navigate(ROOT_ROUTES.LOGIN);
  };

  return (
    <StyledLogin
      alignItems={AlignItems.CENTER}
      direction={FlexDirections.COLUMN}
    >
      {isLoggingOut && <AbsoluteOverflowLoader />}
      <StyledLogoutBtn role="button" onClick={() => void logout()}>
        Signout
      </StyledLogoutBtn>
    </StyledLogin>
  );
};
