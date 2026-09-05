import { providerAvailability } from "@web/auth/providers/provider-availability.instance";

export const {
  resetGoogleAvailabilityForTests,
  setGoogleAvailabilityForTests,
  useIsGoogleAvailable,
  useIsConnectGoogleAvailable,
} = providerAvailability;
