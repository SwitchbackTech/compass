import { ENV_WEB } from "@web/common/constants/env.constants";

export const validateGoogleAccessToken = async () => {
  try {
    const res = await fetch(`${ENV_WEB.API_BASEURL}/auth/google`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) return false;

    const body = (await res.json()) as { isValid: boolean };

    return !!body.isValid;
  } catch (error) {
    console.error(error);
    return false;
  }
};
