import React, { useEffect, useState } from "react";
import Session from "supertokens-auth-react/recipe/session";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { signOut } from "supertokens-auth-react/recipe/session";
import { SyncApi } from "@web/common/apis/sync.api";
import { AlignItems, FlexDirections } from "@web/components/Flex/styled";

import { StyledLogin } from "../Login/styled";

export const LogoutView = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const isLoggedIn = await Session.doesSessionExist();
      if (!isLoggedIn) {
        alert("You're not logged in");
        goToLogin();
      }
    };

    checkSession().catch((e) => {
      alert(e);
      console.log(e);
    });
  }, []);

  const goToLogin = () => {
    window.location = `#${ROOT_ROUTES.LOGIN}`;
    window.location.reload();
  };

  const logout = async () => {
    setIsLoggingOut(true);
    await SyncApi.stopWatches();
    await signOut();
    setIsLoggingOut(false);
    alert("You logged out - see ya! ✌");
    window.location = `#${ROOT_ROUTES.LOGIN}`;
    window.location.reload();
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
