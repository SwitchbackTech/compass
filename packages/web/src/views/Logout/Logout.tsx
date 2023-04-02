import React, { useEffect, useState } from "react";
import Session from "supertokens-auth-react/recipe/session";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { signOut } from "supertokens-auth-react/recipe/session";
import { SyncApi } from "@web/common/apis/sync.api";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";
import { useNavigate } from "react-router-dom";

import { StyledLogin } from "../Login/styled";

export const LogoutView = () => {
  const navigate = useNavigate();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const isLoggedIn = await Session.doesSessionExist();
      if (!isLoggedIn) {
        alert("You're not logged in");
        navigate(ROOT_ROUTES.LOGIN);
      }
    };

    checkSession().catch((e) => {
      alert(e);
      console.log(e);
    });
  }, [navigate]);

  const logout = async () => {
    setIsLoggingOut(true);

    await SyncApi.stopWatches();
    await signOut();

    setIsLoggingOut(false);

    alert("You logged out - see ya! ✌");
    navigate(ROOT_ROUTES.LOGIN);
  };

  return (
    <StyledLogin
      alignItems={AlignItems.CENTER}
      direction={FlexDirections.COLUMN}
    >
      {isLoggingOut && <AbsoluteOverflowLoader />}
      <button onClick={() => void logout()}>Signout</button>
    </StyledLogin>
  );
};
