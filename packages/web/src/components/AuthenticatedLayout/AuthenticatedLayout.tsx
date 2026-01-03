import { Outlet } from "react-router-dom";
import { useGlobalShortcuts } from "@web/views/Calendar/hooks/shortcuts/useGlobalShortcuts";
import { CmdPaletteGuide } from "@web/views/Onboarding/components/CmdPaletteGuide";

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
      <CmdPaletteGuide />
    </>
  );
};
