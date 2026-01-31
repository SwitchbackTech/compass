import { Outlet } from "react-router-dom";
import { SyncEventsOverlay } from "@web/components/SyncEventsOverlay/SyncEventsOverlay";
import { useGlobalShortcuts } from "@web/views/Calendar/hooks/shortcuts/useGlobalShortcuts";
import { OnboardingGuide } from "@web/views/Onboarding/components/OnboardingGuide";

/**
 * Layout component for authenticated routes
 * Handles shared logic like data refetching that should run for all authenticated views
 */
export const AuthenticatedLayout = () => {
  // Automatically refetch events when needed for all authenticated views
  useGlobalShortcuts();

  return (
    <>
      <Outlet />
      <OnboardingGuide />
      <SyncEventsOverlay />
    </>
  );
};
