import { useLayoutEffect, useState } from "react";
import Session from "supertokens-auth-react/recipe/session";
import { AuthApi } from "@web/common/apis/auth.api";

export const useAuthCheck = () => {
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isSessionActive, setIsSessionActive] = useState<boolean | null>(null);
  const [isGoogleTokenActive, setIsGoogleTokenActive] = useState<
    boolean | null
  >(null);

  useLayoutEffect(() => {
    const checkAuth = async () => {
      try {
        setIsCheckingAuth(true);
        const _isSessionActive = await Session.doesSessionExist();
        setIsSessionActive(_isSessionActive);

        const _isGoogleTokenActive = await AuthApi.validateGoogleAccessToken();
        setIsGoogleTokenActive(_isGoogleTokenActive);

        setIsAuthenticated(isSessionActive && isGoogleTokenActive);
      } catch (error) {
        console.error("Error checking authentication:", error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    void checkAuth();
  }, [isGoogleTokenActive, isSessionActive]);

  return {
    isAuthenticated,
    isCheckingAuth,
    isGoogleTokenActive,
    isSessionActive,
  };
};
