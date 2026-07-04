import { Outlet } from "react-router-dom";
import { useResponsiveLayout } from "@web/common/hooks/useResponsiveLayout";

/**
 * Layout component for authenticated routes
 * Handles shared logic like data refetching that should run for all authenticated views
 */
export const AuthenticatedLayout = () => {
  useResponsiveLayout();
  return <Outlet />;
};
