import { AppConfigApi } from "@web/api/app-config.api";
import { IS_GOOGLE_AUTH_CONFIGURED } from "@web/auth/google/google-auth-config";
import { createGoogleAvailability } from "./useIsGoogleAvailable.factory";

const googleAvailability = createGoogleAvailability({
  getConfig: AppConfigApi.get,
  isGoogleAuthConfigured: IS_GOOGLE_AUTH_CONFIGURED,
});

export const {
  resetGoogleAvailabilityForTests,
  setGoogleAvailabilityForTests,
  useIsGoogleAvailable,
} = googleAvailability;
