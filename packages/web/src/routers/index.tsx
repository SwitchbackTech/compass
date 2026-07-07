import {
  type AnyRouter,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { routeTree } from "@web/routers/router.routes";

export const router = createRouter({
  routeTree,
  defaultPendingComponent: AbsoluteOverflowLoader,
  // Fast loaders (the common case) never show the overlay at all; slower
  // ones show it for at least defaultPendingMinMs so it doesn't flash.
  defaultPendingMs: 300,
  defaultPendingMinMs: 200,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export const CompassRouterProvider = (props?: { router?: AnyRouter }) => {
  return <RouterProvider router={props?.router ?? router} />;
};
