import { createProviderAvailability } from "@web/auth/providers/provider-availability.factory";

type AppConfigResponse = {
  google?: { isConfigured?: boolean };
};

type GoogleAvailabilityDependencies = {
  getConfig: () => Promise<AppConfigResponse>;
  isGoogleAuthConfigured: boolean;
};

export function createGoogleAvailability({
  getConfig,
  isGoogleAuthConfigured,
}: GoogleAvailabilityDependencies) {
  const availability = createProviderAvailability({
    getConfig,
    isGoogleAuthConfigured,
  });

  return {
    resetGoogleAvailabilityForTests:
      availability.resetGoogleAvailabilityForTests,
    setGoogleAvailabilityForTests: availability.setGoogleAvailabilityForTests,
    useIsGoogleAvailable: availability.useIsGoogleAvailable,
    useIsConnectGoogleAvailable: availability.useIsConnectGoogleAvailable,
  };
}
