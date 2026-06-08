import {
  createBrowserRouter,
  RouterProvider,
  type RouterProviderProps,
} from "react-router-dom";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { routeObjects } from "@web/routers/router.routes";

export const router = createBrowserRouter(routeObjects, {
  future: {
    v7_relativeSplatPath: true,
  },
});

export const CompassRouterProvider = (
  props?: Partial<Pick<RouterProviderProps, "router">>,
) => {
  return (
    <RouterProvider
      router={props?.router ?? router}
      future={{ v7_startTransition: true }}
      fallbackElement={<AbsoluteOverflowLoader />}
    />
  );
};
