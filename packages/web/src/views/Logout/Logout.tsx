import React from "react";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { signOut } from "supertokens-auth-react/recipe/session";

export const LogoutView = () => {
  const logout = async () => {
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
