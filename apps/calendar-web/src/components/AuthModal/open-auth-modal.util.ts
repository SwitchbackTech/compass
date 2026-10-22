import { importOrReload } from "@web/common/utils/browser/missing-chunk-reload.util";
import {
  type AuthView,
  VIEW_TO_PARAM,
} from "@web/components/AuthModal/hooks/useAuthModal";

/**
 * Opens the auth modal from outside the router tree (toasts, billing guards).
 * Dynamic import avoids a module cycle through the router root route.
 */
export async function openAuthModalFromOutsideRouter(
  view: AuthView = "login",
): Promise<void> {
  const { router } = await importOrReload(() => import("@web/routers"));
  router.navigate({
    to: ".",
    search: (prev: Record<string, unknown>) => ({
      ...prev,
      auth: VIEW_TO_PARAM[view],
    }),
  });
}
