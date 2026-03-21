import { Outlet } from "react-router-dom";
import { SyncEventsOverlay } from "@web/components/SyncEventsOverlay/SyncEventsOverlay";

/**
 * Layout component for authenticated routes
 * Handles shared logic like data refetching that should run for all authenticated views
 */
export const AuthenticatedLayout = () => {
  return (
    <>
      <Outlet />
      <SyncEventsOverlay />
    </>
  );
};
