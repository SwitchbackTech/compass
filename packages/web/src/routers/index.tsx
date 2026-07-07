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
  defaultPendingMs: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export const CompassRouterProvider = (props?: { router?: AnyRouter }) => {
  return <RouterProvider router={props?.router ?? router} />;
};
