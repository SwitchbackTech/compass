import { useState, useLayoutEffect } from "react";
import Session from "supertokens-auth-react/recipe/session";
import { AuthApi } from "@web/common/apis/auth.api";

export const useAuthCheck = () => {
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isGAccessTokenActive, setIsGAccessTokenActive] = useState(false);

  useLayoutEffect(() => {
    const checkAuth = async () => {
      try {
        setIsCheckingAuth(true);
        const _isSessionActive = await Session.doesSessionExist();
        setIsSessionActive(_isSessionActive);

        const _isGAccessTokenActive = await AuthApi.validateGoogleAccessToken();
        setIsGAccessTokenActive(_isGAccessTokenActive);

        setIsAuthenticated(isSessionActive && isGAccessTokenActive);
      } catch (error) {
        console.error("Error checking authentication:", error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    void checkAuth();
  }, [isGAccessTokenActive, isSessionActive]);

  return {
    isAuthenticated,
    isCheckingAuth,
    isGAccessTokenActive,
    isSessionActive,
  };
};
