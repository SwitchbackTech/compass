import { ENV_WEB } from "@web/common/constants/env.constants";

export class GoogleOAuthSession {
  static async verifySession() {
    try {
      const res = await fetch(`${ENV_WEB.API_BASEURL}/auth/google`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) return false;

      const body = (await res.json()) as { valid: boolean };

      return !!body.valid;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
}
