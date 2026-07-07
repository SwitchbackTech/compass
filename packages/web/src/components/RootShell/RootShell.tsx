import { Outlet } from "@tanstack/react-router";
import { AuthModal } from "@web/components/AuthModal/AuthModal";
import { AuthModalProvider } from "@web/components/AuthModal/AuthModalProvider";
import { WelcomeModal } from "@web/components/WelcomeModal/WelcomeModal";

/**
 * The auth modal is driven by the router's `?auth=` search param, so its
 * provider must live inside the router (a sibling to `RouterProvider` can't
 * call router hooks). Mounting it at the root route also keeps the modal
 * available on every matched route, including 404s.
 */
export function RootShell() {
  return (
    <AuthModalProvider>
      <Outlet />
      <AuthModal />
      <WelcomeModal />
    </AuthModalProvider>
  );
}
