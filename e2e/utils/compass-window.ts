import { z } from "zod";

type CompassE2EUserMetadataState = {
  current?: {
    google?: {
      connectionState?: string;
    };
  } | null;
  status?: string;
};

/**
 * Zod schema for the semantic user-metadata bridge exposed on window for e2e
 * testing. Validates that the bridge is available with its action surface.
 */
const CompassStoreSchema = z.object({
  userMetadata: z.object({
    getState: z.function(),
    set: z.function(),
    setLoading: z.function(),
    clear: z.function(),
  }),
});

/**
 * Zod schema for the session test hooks set by SessionProvider.
 */
const CompassHooksSchema = z.object({
  setAuthenticated: z.function(),
});

/**
 * Full schema for the compass e2e globals on window.
 * Use compassWindowSchema.parse(window) to validate the window before accessing globals.
 */
export const CompassWindowSchema = z.object({
  __COMPASS_E2E_TEST__: z.boolean().optional(),
  __COMPASS_E2E_STORE__: CompassStoreSchema.optional(),
  __COMPASS_E2E_HOOKS__: CompassHooksSchema.optional(),
});

export type CompassStore = z.infer<typeof CompassStoreSchema>;
export type CompassWindow = z.infer<typeof CompassWindowSchema>;

/**
 * Augment the global Window type so Playwright page.evaluate() callbacks
 * can access compass e2e globals without (window as any) casts.
 *
 * These are set by the app when __COMPASS_E2E_TEST__ is true:
 * - __COMPASS_E2E_TEST__   set by prepareOAuthTestPage via addInitScript
 * - __COMPASS_E2E_STORE__  set by packages/web/src/auth/state/user-metadata.store.ts
 * - __COMPASS_E2E_HOOKS__  set by SessionProvider.tsx
 */
declare global {
  interface Window {
    __COMPASS_E2E_TEST__?: boolean;
    __COMPASS_E2E_STORE__?: {
      userMetadata: {
        getState: () => CompassE2EUserMetadataState;
        set: (metadata: { google?: { connectionState?: string } }) => void;
        setLoading: () => void;
        clear: () => void;
      };
    };
    __COMPASS_E2E_HOOKS__?: {
      setAuthenticated: (value: boolean) => void;
    };
  }
}
