import { useState } from "react";
import { LocalStorage } from "@web/common/constants/web.constants";

export const useToken = () => {
  const getToken = (): string => {
    return localStorage.getItem(LocalStorage.TOKEN);
  };

  const [token, setToken] = useState(getToken());

  const saveToken = (token: string) => {
    localStorage.setItem(LocalStorage.TOKEN, token);
    setToken(token);
  };

  return {
    token,
    setToken: saveToken,
  };
};
