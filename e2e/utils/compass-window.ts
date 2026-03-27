import { z } from "zod";

/**
 * Zod schema for the Redux store subset exposed on window for e2e testing.
 * Validates that the store is available and has the expected dispatch/getState surface.
 */
export const compassStoreSchema = z.object({
  dispatch: z.function(),
  getState: z.function(),
});

/**
 * Zod schema for the session test hooks set by SessionProvider.
 */
export const compassHooksSchema = z.object({
  setAuthenticated: z.function(),
});

/**
 * Full schema for the compass e2e globals on window.
 * Use compassWindowSchema.parse(window) to validate the window before accessing globals.
 */
export const compassWindowSchema = z.object({
  __COMPASS_E2E_TEST__: z.boolean().optional(),
  __COMPASS_E2E_STORE__: compassStoreSchema.optional(),
  __COMPASS_E2E_HOOKS__: compassHooksSchema.optional(),
});

export type CompassStore = z.infer<typeof compassStoreSchema>;
export type CompassWindow = z.infer<typeof compassWindowSchema>;

/**
 * Augment the global Window type so Playwright page.evaluate() callbacks
 * can access compass e2e globals without (window as any) casts.
 *
 * These are set by the app when __COMPASS_E2E_TEST__ is true:
 * - __COMPASS_E2E_TEST__   set by prepareOAuthTestPage via addInitScript
 * - __COMPASS_E2E_STORE__  set by packages/web/src/store/index.ts
 * - __COMPASS_E2E_HOOKS__  set by SessionProvider.tsx
 */
declare global {
  interface Window {
    __COMPASS_E2E_TEST__?: boolean;
    __COMPASS_E2E_STORE__?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatch: (action: any) => any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getState: () => any;
    };
    __COMPASS_E2E_HOOKS__?: {
      setAuthenticated: (value: boolean) => void;
    };
  }
}
