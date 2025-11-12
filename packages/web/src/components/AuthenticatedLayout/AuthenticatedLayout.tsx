import { Outlet } from "react-router-dom";
import { useRefetch } from "@web/views/Calendar/hooks/useRefetch";

/**
 * Layout component for authenticated routes
 * Handles shared logic like data refetching that should run for all authenticated views
 */
export const AuthenticatedLayout = () => {
  // Automatically refetch events when needed for all authenticated views
  useRefetch();

  return <Outlet />;
};
