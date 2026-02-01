import { Outlet } from "react-router-dom";
import { useGlobalShortcuts } from "@web/views/Calendar/hooks/shortcuts/useGlobalShortcuts";

/**
 * Layout component for unauthenticated/guest users
 * Provides the same global shortcuts (like cmd+k) as authenticated users
 * but without requiring authentication
 */
export const GuestLayout = () => {
  // Enable global shortcuts for guest users (including cmd+k palette)
  useGlobalShortcuts();

  return <Outlet />;
};
