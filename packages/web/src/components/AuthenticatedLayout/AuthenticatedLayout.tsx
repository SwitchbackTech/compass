import { SyncEventsOverlay } from "@web/components/SyncEventsOverlay/SyncEventsOverlay";
import { Outlet } from "react-router-dom";

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
