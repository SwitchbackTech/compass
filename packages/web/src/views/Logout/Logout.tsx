import React from "react";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { signOut } from "supertokens-auth-react/recipe/session";
import { SyncApi } from "@web/common/apis/sync.api";

export const LogoutView = () => {
  const logout = async () => {
    await SyncApi.stopWatches();
    await signOut();
    alert("You logged out");
    window.location = `#${ROOT_ROUTES.LOGIN}`;
  };

  return (
    <>
      <button onClick={logout}>Signout</button>
    </>
  );
};
