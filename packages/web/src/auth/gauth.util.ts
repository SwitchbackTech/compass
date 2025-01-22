import { ENV_WEB } from "@web/common/constants/env.constants";

interface HttpFetch_GoogleAuthResponse {
  isValid: boolean;
}

export const validateGoogleAccessToken = async () => {
  try {
    const res = await fetch(`${ENV_WEB.API_BASEURL}/auth/google`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) return false;

    const body = (await res.json()) as HttpFetch_GoogleAuthResponse;

    return !!body.isValid;
  } catch (error) {
    console.error(error);
    return false;
  }
};
