import { AppConfigApi } from "@web/api/app-config.api";
import { IS_GOOGLE_AUTH_CONFIGURED } from "@web/common/constants/env.constants";
import { createGoogleAvailability } from "./useIsGoogleAvailable.factory";

const googleAvailability = createGoogleAvailability({
  getConfig: AppConfigApi.get,
  isGoogleAuthConfigured: IS_GOOGLE_AUTH_CONFIGURED,
});

export const { resetGoogleAvailabilityForTests, useIsGoogleAvailable } =
  googleAvailability;
